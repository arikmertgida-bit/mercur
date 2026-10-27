import { FieldPath, FieldValues, UseFormReturn } from "react-hook-form"
import { z } from "zod"

const isFieldPathOf = <TFieldValues extends FieldValues>(
  fields: FieldPath<TFieldValues>[],
  name: string
): name is FieldPath<TFieldValues> =>
  fields.some((field) => name === field || name.startsWith(`${field}.`))

/**
 * Validates the fields of one wizard tab against that tab's schema and
 * reports the issues on the form (nested issues keep their full path, e.g. a
 * single price cell).
 */
export const validateFormFields = <TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  fields: FieldPath<TFieldValues>[],
  schema: z.ZodType
): boolean => {
  form.clearErrors(fields)

  const values = Object.fromEntries(
    fields.map((field) => [field, form.getValues(field)])
  )

  const result = schema.safeParse(values)

  if (result.success) {
    return true
  }

  for (const { path, message, code } of result.error.issues) {
    const name = path.join(".")

    if (isFieldPathOf(fields, name)) {
      form.setError(name, { type: code, message })
    }
  }

  return false
}
