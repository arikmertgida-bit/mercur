import { JsonValue } from "../json-value"

export type BaseField = {
    type: 'string'
    | 'text'
    | 'integer'
    | 'boolean'
    | 'date'
    | 'time'
    | 'datetime'
    | 'json'
    | 'array'
    | 'float',
    nullable?: boolean,
    defaultValue?: JsonValue
}

export type EnumField = Omit<BaseField, 'type'> & {
    type: 'enum',
    enum: string[],
}

export type Field = BaseField | EnumField

export type CustomFieldsModuleOptions = { customFields?: { [K in string]?: Record<string, Field> } }
