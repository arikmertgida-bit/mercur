import { FieldPath, FieldValues, UseFormReturn } from "react-hook-form"

export interface TabDefinition<T extends FieldValues = FieldValues> {
  /** Unique tab identifier, used as ProgressTabs value */
  id: string
  /** i18n key for the tab label (used when `label` is not provided) */
  labelKey: string
  /** Raw label string (overrides `labelKey`) */
  label?: string
  /** Fields validated when navigating forward from this tab. If omitted, full form validation is used. */
  validationFields?: FieldPath<T>[]
  /** Predicate to conditionally show/hide this tab at runtime */
  isVisible?: (form: UseFormReturn<T>) => boolean
}

/**
 * Helper to declare tab metadata on a component with type safety.
 */
export const defineTabMeta = <T extends FieldValues = FieldValues>(
  meta: TabDefinition<T>
): TabDefinition<T> => {
  return meta
}
