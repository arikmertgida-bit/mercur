import {
    compressName,
    mikroOrmSoftDeletableFilterOptions,
    simpleHash,
    SoftDeletableFilterKey,
} from "@medusajs/framework/utils"

import {
    EntitySchema,
    EntitySchemaMetadata,
    EntitySchemaProperty,
} from "@medusajs/framework/mikro-orm/core"
import { Field } from "@mercurjs/types"

import type { CustomFieldRow, CustomFieldValue } from "../services/custom-fields-module-service"

type CustomFieldProperty = EntitySchemaProperty<CustomFieldValue, CustomFieldRow>

function getClass(className: string, ...properties: string[]) {
    const cls = {
        [className]: class {
            constructor(...values) {
                properties.forEach((name, idx) => {
                    this[name] = values[idx]
                })
            }
        }
    }
    return cls[className]
}

export function generateEntity(
    tableName: string,
    fields: (Field & { name: string })[]
) {
    // e.g. "product_custom_fields" -> "product_id"
    const entityName = tableName.replace(/_custom_fields$/, "")
    const foreignKeyName = `${entityName}_id`
    const fieldNames = [foreignKeyName, ...fields.map((f) => f.name)]

    const typeMap: Record<string, string> = {
        string: "string",
        text: "text",
        integer: "number",
        float: "number",
        boolean: "boolean",
        date: "date",
        time: "time",
        datetime: "date",
        json: "any",
        array: "array",
        enum: "enum",
    }

    // `date` alone maps to Postgres `date` (no time-of-day, no timezone) —
    // fine for the `date` field type, but a `datetime` field needs the same
    // `timestamptz` column type as created_at/updated_at below, or the time
    // component is silently dropped on every write.
    const columnTypeOverrides: Record<string, string> = {
        datetime: "timestamptz",
    }

    const properties: Record<string, CustomFieldProperty> = {}
    for (const field of fields) {
        const prop = {
            type: typeMap[field.type] ?? field.type,
            nullable: field.nullable ?? true,
            ...(columnTypeOverrides[field.type]
                ? { columnType: columnTypeOverrides[field.type] }
                : {}),
            ...(field.defaultValue !== undefined
                ? {
                    defaultRaw: typeof field.defaultValue === 'string'
                        ? `'${field.defaultValue.replace(/'/g, "''")}'`
                        : String(field.defaultValue)
                }
                : {}),
        }

        properties[field.name] =
            field.type === "enum"
                ? { ...prop, items: () => field.enum, enum: true }
                : prop
    }

    const hashTableName = simpleHash(tableName)
    const compressed = compressName(tableName)

    // These tables are defined entirely at runtime from caller-supplied field
    // lists, so the entity is a row keyed by any column name.
    const entityProperties: EntitySchemaMetadata<CustomFieldRow>["properties"] = {
        id: {
            type: "string",
            nullable: false,
            primary: true,
        },
        [foreignKeyName]: {
            type: "string",
            nullable: false,
        },
        ...properties,
        created_at: {
            columnType: "timestamptz",
            type: "date",
            nullable: false,
            defaultRaw: "CURRENT_TIMESTAMP",
        },
        updated_at: {
            columnType: "timestamptz",
            type: "date",
            nullable: false,
            defaultRaw: "CURRENT_TIMESTAMP",
        },
        deleted_at: {
            columnType: "timestamptz",
            type: "date",
            nullable: true,
        },
    }

    return new EntitySchema<CustomFieldRow>({
        // @ts-expect-error — `getClass` builds a genuinely dynamic, runtime-named
        // class from a caller-supplied field list, assigned via `this[name] =`
        // rather than static property declarations, so it can never structurally
        // satisfy MikroORM's `EntityClass<CustomFieldRow>` at the type
        // level. Real third-party (MikroORM) type boundary, not a shortcut.
        class: getClass(
            tableName,
            ...fieldNames.concat("created_at", "updated_at", "deleted_at")
        ),
        tableName: compressed,
        properties: entityProperties,
        filters: {
            [SoftDeletableFilterKey]: mikroOrmSoftDeletableFilterOptions,
        },
        hooks: {
            beforeUpdate: [
                (args) => {
                    args.entity.updated_at = new Date()
                },
            ],
        },
        indexes: [
            {
                properties: ["id"],
                name: "IDX_id_" + hashTableName,
            },
            {
                properties: ["deleted_at"],
                name: "IDX_deleted_at_" + hashTableName,
            },
        ],
    })
}
