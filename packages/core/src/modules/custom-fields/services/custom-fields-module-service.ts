import { CustomFieldsModuleOptions } from "@mercurjs/types";
import { FindConfig } from "@medusajs/framework/types";
import {
    MedusaError,
    compressName,
    generateEntityId,
    camelToSnakeCase,
} from "@medusajs/framework/utils";
import { MedusaModule } from "@medusajs/framework/modules-sdk";
import type { Knex } from "@medusajs/framework/mikro-orm/knex";

/** A custom-field value can only be a JSON scalar — the columns are dynamically
 *  defined per alias (see CustomFieldsModuleOptions) with no fixed schema. */
export type CustomFieldValue = string | number | boolean | Date | null;

export type CustomFieldRow = { id: string } & Record<string, CustomFieldValue>;

type CustomFieldEntry = { id: string } & Record<string, CustomFieldValue>;

export default class CustomFieldsModuleService {
    protected readonly options_: CustomFieldsModuleOptions;
    protected aliasToEntityMap_: Map<string, string> = new Map();
    protected pgConnection_: Knex;

    __hooks = {
        onApplicationStart: async () => {
            this.onApplicationStart();
        },
    };

    constructor(container: { __pg_connection__: Knex }, options: CustomFieldsModuleOptions) {
        this.options_ = options;
        this.pgConnection_ = container.__pg_connection__;
    }

    async onApplicationStart(): Promise<void> {
        this.buildAliasToEntityMap_();
    }

    protected buildAliasToEntityMap_(): void {
        const joinerConfigs = MedusaModule.getAllJoinerConfigs();
        const entityNames = Object.keys(this.options_.customFields ?? {});

        for (const joinerConfig of joinerConfigs) {
            const joinerConfigAliases = Array.isArray(joinerConfig.alias)
                ? joinerConfig.alias
                : [joinerConfig.alias!];

            for (const entityName of entityNames) {
                const entityAlias = joinerConfigAliases.find(
                    (alias) => alias?.entity === entityName,
                );

                if (!entityAlias) {
                    continue;
                }

                const names = Array.isArray(entityAlias.name)
                    ? entityAlias.name
                    : [entityAlias.name];

                const snakeEntity = camelToSnakeCase(entityName);

                for (const name of names) {
                    this.aliasToEntityMap_.set(name, snakeEntity);
                }
            }
        }
    }

    async list(
        filter: Record<string, string | string[]>,
        config: FindConfig<CustomFieldRow>,
    ): Promise<CustomFieldRow[]>;
    async list(
        alias: string,
        filters: Record<string, string | string[]>,
        config: FindConfig<CustomFieldRow>,
    ): Promise<CustomFieldRow[]>;

    async list(
        filterOrAlias: Record<string, string | string[]> | string,
        filtersOrConfig: Record<string, string | string[]> | FindConfig<CustomFieldRow>,
        maybeConfig?: FindConfig<CustomFieldRow>,
    ): Promise<CustomFieldRow[]> {
        let alias: string;
        let filters: Record<string, string | string[]>;
        let config: FindConfig<CustomFieldRow>;

        if (typeof filterOrAlias === "string") {
            alias = filterOrAlias;
            filters = filtersOrConfig as Record<string, string | string[]>;
            if (!maybeConfig) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_ARGUMENT,
                    "config is required when calling list(alias, filters, config)",
                );
            }
            config = maybeConfig;
        } else {
            const filter = filterOrAlias;
            if (Object.keys(filter).length !== 1) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_ARGUMENT,
                    "Only single filter is allowed",
                );
            }
            const filterKey = Object.keys(filter)[0];
            alias = filterKey.split("_").slice(0, -1).join("_");
            filters = filter;
            config = filtersOrConfig as FindConfig<CustomFieldRow>;
        }

        const snakeEntity = this.resolveAlias_(alias);
        const tableName = compressName(`${snakeEntity}_custom_fields`);
        const knex = this.pgConnection_;

        const query = knex(tableName).whereNull("deleted_at");

        for (const [filterKey, filterValue] of Object.entries(filters)) {
            if (Array.isArray(filterValue)) {
                query.whereIn(filterKey, filterValue);
            } else {
                query.where(filterKey, filterValue);
            }
        }

        if (config.select) {
            query.select(config.select as string[]);
        }

        return await query;
    }

    protected resolveAlias_(alias: string): string {
        const snakeEntity = this.aliasToEntityMap_.get(alias);

        if (!snakeEntity) {
            throw new MedusaError(
                MedusaError.Types.INVALID_ARGUMENT,
                `Unknown custom fields alias: ${alias}`,
            );
        }

        return snakeEntity;
    }

    async upsert(
        alias: string,
        data: CustomFieldEntry | CustomFieldEntry[],
    ): Promise<CustomFieldEntry[]> {
        const items = Array.isArray(data) ? data : [data];
        const snakeEntity = this.resolveAlias_(alias);
        const foreignKey = snakeEntity + "_id";
        const tableName = compressName(`${snakeEntity}_custom_fields`);
        const knex = this.pgConnection_;

        const foreignKeyValues = items.map((entry) => entry.id);

        const existing: Array<Record<string, CustomFieldValue>> = await knex(tableName)
            .whereIn(foreignKey, foreignKeyValues)
            .whereNull("deleted_at");

        const existingMap = new Map<string, Record<string, CustomFieldValue>>(
            existing.map((row) => [String(row[foreignKey]), row]),
        );

        const toInsert: Record<string, CustomFieldValue>[] = [];
        const toUpdate: { id: string; fields: Record<string, CustomFieldValue> }[] = [];

        for (const item of items) {
            const { id, ...fields } = item;
            const existingRow = existingMap.get(id);
            if (existingRow) {
                toUpdate.push({ id: String(existingRow.id), fields });
            } else {
                toInsert.push({
                    ...fields,
                    [foreignKey]: id,
                    id: generateEntityId(undefined, "cf"),
                });
            }
        }

        await knex.transaction(async (trx) => {
            if (toInsert.length) {
                await trx(tableName).insert(toInsert);
            }
            for (const { id, fields } of toUpdate) {
                await trx(tableName)
                    .where("id", id)
                    .update({ ...fields, updated_at: new Date() });
            }
        });

        return items;
    }

    async delete(alias: string, ids: string | string[]): Promise<void> {
        const items = Array.isArray(ids) ? ids : [ids];
        const snakeEntity = this.resolveAlias_(alias);
        const tableName = compressName(`${snakeEntity}_custom_fields`);
        const knex = this.pgConnection_;

        await knex.transaction(async (trx) => {
            await trx(tableName)
                .whereIn(`${snakeEntity}_id`, items)
                .update({ deleted_at: new Date() });
        });
    }

    /** Snapshot of full rows keyed by owner id — used by workflow compensate to capture pre-mutation state. */
    async listByOwnerIds(
        alias: string,
        ids: string | string[],
    ): Promise<CustomFieldRow[]> {
        const items = Array.isArray(ids) ? ids : [ids];
        const snakeEntity = this.resolveAlias_(alias);
        const foreignKey = snakeEntity + "_id";
        const tableName = compressName(`${snakeEntity}_custom_fields`);
        const knex = this.pgConnection_;

        const rows: Array<Record<string, CustomFieldValue>> = await knex(tableName)
            .whereIn(foreignKey, items)
            .whereNull("deleted_at");

        return rows.map((row) => ({
            ...row,
            id: String(row[foreignKey]),
        }));
    }

    /** Reverses delete() by clearing deleted_at for the given owner ids — used by workflow compensate. */
    async restore(alias: string, ids: string | string[]): Promise<void> {
        const items = Array.isArray(ids) ? ids : [ids];
        const snakeEntity = this.resolveAlias_(alias);
        const tableName = compressName(`${snakeEntity}_custom_fields`);
        const knex = this.pgConnection_;

        await knex.transaction(async (trx) => {
            await trx(tableName)
                .whereIn(`${snakeEntity}_id`, items)
                .update({ deleted_at: null });
        });
    }
}
