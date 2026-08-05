import {
    compressName,
    mikroOrmSoftDeletableFilterOptions,
    simpleHash,
    SoftDeletableFilterKey,
} from "@medusajs/framework/utils"

import { EntitySchema } from "@medusajs/framework/mikro-orm/core"
import { Field } from "@mercurjs/types"

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

    const properties = fields.reduce((acc, field) => {
        const prop: Record<string, any> = {
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

        if (field.type === "enum" && "enum" in field) {
            prop.items = () => field.enum
            prop.enum = true
        }

        acc[field.name] = prop
        return acc
    }, {} as Record<string, any>)

    const hashTableName = simpleHash(tableName)
    const compressed = compressName(tableName)

    // MikroORM's `EntitySchema` generic infers its entity shape from this literal,
    // which would otherwise over-constrain `indexes[].properties` below to just
    // this table's dynamic custom-field names. Typed loosely on purpose — these
    // tables are defined entirely at runtime from caller-supplied field lists.
    const entityProperties: Record<string, any> = {
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

    return new EntitySchema<Record<string, unknown>>({
        // @ts-expect-error — `getClass` builds a genuinely dynamic, runtime-named
        // class from a caller-supplied field list, assigned via `this[name] =`
        // rather than static property declarations, so it can never structurally
        // satisfy MikroORM's `EntityClass<Record<string, unknown>>` at the type
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
