import { JsonValueSchema } from "@mercurjs/dashboard-shared"
import i18next from "i18next"
import { FieldPath, FieldValues, UseFormReturn } from "react-hook-form"
import { z } from "zod"
import { castNumber } from "./cast-number"

/**
 * Validates that an optional value is an integer.
 */
export const optionalInt = z
  .union([z.string(), z.number()])
  .optional()
  .refine(
    (value) => {
      if (value === "" || value === undefined) {
        return true
      }

      return Number.isInteger(castNumber(value))
    },
    {
      message: i18next.t("validation.mustBeInt"),
    }
  )
  .refine(
    (value) => {
      if (value === "" || value === undefined) {
        return true
      }

      return castNumber(value) >= 0
    },
    {
      message: i18next.t("validation.mustBePositive"),
    }
  )

/**
 * Validates that an optional value is an number.
 */
export const optionalFloat = z
  .union([z.string(), z.number()])
  .optional()
  .refine(
    (value) => {
      if (value === "" || value === undefined) {
        return true
      }

      return castNumber(value) >= 0
    },
    {
      message: i18next.t("validation.mustBePositive"),
    }
  )

/**
 * Schema for metadata form.
 */
export const metadataFormSchema = z.array(
  z.object({
    key: z.string(),
    value: JsonValueSchema,
    isInitial: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    isIgnored: z.boolean().optional(),
  })
)

const isFieldPathOf = <TForm extends FieldValues>(
  fields: FieldPath<TForm>[],
  name: string
): name is FieldPath<TForm> =>
  fields.some((field) => name === field || name.startsWith(`${field}.`))

/**
 * Validate subset of form fields
 * @param form
 * @param fields
 * @param schema
 */
export function partialFormValidation<TForm extends FieldValues>(
  form: UseFormReturn<TForm>,
  fields: FieldPath<TForm>[],
  schema: z.ZodType
): boolean {
  form.clearErrors(fields)

  const values = Object.fromEntries(
    fields.map((field) => [field, form.getValues(field)])
  )

  const validationResult = schema.safeParse(values)

  if (!validationResult.success) {
    for (const { path, message, code } of validationResult.error.issues) {
      const name = path.join(".")

      if (isFieldPathOf(fields, name)) {
        form.setError(name, { type: code, message })
      }
    }

    return false
  }

  return true
}
