import type { ComponentType, ReactNode } from "react"
import type { JsonRecord, JsonValue } from "@mercurjs/types"

/**
 * Minimal structural stand-in for a Zod schema, so the SDK stays free of a zod
 * dependency. `createFormHelper` (in `@mercurjs/dashboard-shared`) produces real
 * zod schemas that satisfy this shape. `data`/the parse return allow
 * `undefined` because an `.optional()` field's parsed value is legitimately
 * absent — that's a real, valid outcome distinct from "not JSON-serializable".
 */
export type FieldParseResult =
    | { success: true; data: JsonValue | undefined }
    // Real validation libraries (e.g. Zod's `ZodError`) return a rich Error
    // subclass here, not a plain JSON record — nothing in this SDK reads
    // `.error`, so `Error` is the honest supertype rather than a JsonRecord
    // shape no real library actually produces.
    | { success: false; error: Error }

export type FieldValidation = {
    safeParse?: (value: JsonValue) => FieldParseResult
    parse?: (value: JsonValue) => JsonValue | undefined
    def?: { type?: string }
}

/**
 * Per-model registry seeded by each panel's generated `extension-targets.d.ts`
 * and extendable by hand. Shapes the typed form/display zones per model.
 *
 * @example
 * declare module "@mercurjs/dashboard-sdk" {
 *   interface CustomFieldsRegistry {
 *     product: {
 *       formZones: "create" | "edit" | "organize" | "attributes"
 *       formTabs: { create: "general" | "organize"; edit: never }
 *       displayZones: "general" | "organize"
 *     }
 *   }
 * }
 */
export interface CustomFieldsRegistry {}

type DefaultModelShape = {
  formZones: string
  formTabs: Record<string, string>
  displayZones: string
  displayFieldIds: string
}

export type CustomFieldModel = keyof CustomFieldsRegistry extends never
  ? string
  : keyof CustomFieldsRegistry

type ModelShape<TModel> = TModel extends keyof CustomFieldsRegistry
  ? CustomFieldsRegistry[TModel] & DefaultModelShape
  : DefaultModelShape

export type CustomFormField<TData = JsonRecord> = {
  /** Zod schema — drives the input type and validation. */
  validation: FieldValidation
  /** Static default or a resolver from the loaded entity. */
  defaultValue?: ((data: TData) => JsonValue) | JsonValue
  label?: string
  description?: string
  placeholder?: string
  /** Custom render component; falls back to a default input for the type. */
  component?: ComponentType
}

export type CustomFormZone<TModel> = ModelShape<TModel>["formZones"]

/**
 * Valid tab ids for a model's form zone. Narrows to the scanned union when the
 * zone has tabbed forms; falls back to `string` for zones without tabs (e.g.
 * onboarding steps) and for unknown models.
 */
export type CustomFormTab<TModel, TZone> =
  TZone extends keyof ModelShape<TModel>["formTabs"]
    ? ModelShape<TModel>["formTabs"][TZone]
    : string

export type CustomFormEntry<TModel> =
  CustomFormZone<TModel> extends infer TZone
    ? TZone extends CustomFormZone<TModel>
      ? {
          zone: TZone
          /** TabbedForm tab id, or onboarding wizard step id for `zone: "onboarding"`. */
          tab?: CustomFormTab<TModel, TZone>
          fields: Record<string, CustomFormField>
        }
      : never
    : never

/**
 * ADD (unknown id + component), REPLACE (built-in id + component), or REMOVE
 * (built-in id + `component: null`) a section field. Built-in ids autocomplete
 * from the model's generated `displayFieldIds`; any other string adds a new row.
 */
export type CustomDisplayField<TModel extends CustomFieldModel = CustomFieldModel> = {
  id: ModelShape<TModel>["displayFieldIds"] | string
  component: ComponentType<{ data?: JsonRecord }> | null
}

/** Same `{ rank?, component }` shape as list bulk actions. */
export type SectionAction = {
  rank?: number
  component: ComponentType<{ data?: JsonRecord }>
}

export type CustomDisplayEntry<TModel extends CustomFieldModel = CustomFieldModel> = {
  zone: ModelShape<TModel>["displayZones"]
  fields?: CustomDisplayField<TModel>[]
  actions?: SectionAction[]
}

export type ExtendableTableRow = {
  id?: string
}

/**
 * The entity handed to `actionLocks` and `activity`, as the page fetched it.
 * Only `id` is guaranteed across models; validate anything else you read.
 */
export type ExtendableEntity = {
  id?: string
}

export type CustomColumn = {
  id: string
  header?: string
  component?: ComponentType<{ row?: ExtendableTableRow; value?: JsonValue }>
}

export type CustomListFilterOption = {
  label: string
  /** Written to the filter's query param, so it is a string. */
  value: string
}

/**
 * ADD (unknown key), REPLACE (built-in key + a full filter definition), or
 * REMOVE (built-in key + `remove: true`) a list filter. Mirrors
 * `CustomDisplayField`: the `key` is the query param the filter writes.
 */
export type CustomListFilter =
  | ({ key: string; label: string; remove?: never } & (
      | {
          type: "select"
          options: CustomListFilterOption[]
          multiple?: boolean
          searchable?: boolean
        }
      | { type: "date" | "string" | "number"; options?: never }
    ))
  | { key: string; remove: true }

export type CustomListExtension = {
  columns?: CustomColumn[]
  bulkActions?: SectionAction[]
  filters?: CustomListFilter[]
  viewDefaults?: {
    columnVisibility?: Record<string, boolean>
    columnOrder?: string[]
  }
}

/**
 * Action ids a plugin can lock per model. `order` narrows to the RMA and payment
 * actions the order detail sections guard; other models accept any string.
 */
export interface CustomFieldActionRegistry {
  order: "edit" | "return" | "exchange" | "claim" | "fulfill" | "capture" | "refund"
}

export type CustomFieldAction<TModel> = TModel extends keyof CustomFieldActionRegistry
  ? CustomFieldActionRegistry[TModel]
  : string

export type ActivityEntry = {
  title: ReactNode
  timestamp: string | Date
  children?: ReactNode
}

export interface CustomFieldsConfig<TModel extends CustomFieldModel = CustomFieldModel> {
  model: TModel
  /** Module link(s) fetched alongside the entity (e.g. `brand`). */
  link?: string | string[]
  /**
   * Reasons an action on this entity is unavailable, keyed by action id. A
   * returned string disables the action and becomes its tooltip; `undefined`
   * leaves it alone. Evaluated on render with the entity as fetched, including
   * `link` data.
   */
  actionLocks?: Partial<
    Record<
      CustomFieldAction<TModel>,
      (entity: ExtendableEntity) => string | undefined
    >
  >
  /** Extra timeline entries for the entity, merged and sorted with the built-ins. */
  activity?: (entity: ExtendableEntity) => ActivityEntry[]
  list?: CustomListExtension
  forms?: CustomFormEntry<TModel>[]
  displays?: CustomDisplayEntry<TModel>[]
}
