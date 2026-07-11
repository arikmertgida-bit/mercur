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
    value: z.unknown(),
    isInitial: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    isIgnored: z.boolean().optional(),
  })
)

/**
 * Validate subset of form fields
 * @param form
 * @param fields
 * @param schema
 */
export function partialFormValidation<TForm extends FieldValues>(
  form: UseFormReturn<TForm>,
  fields: FieldPath<TForm>[],
  schema: z.ZodSchema<any>
) {
  form.clearErrors(fields)

  const values = fields.reduce((acc, key) => {
    acc[key] = form.getValues(key)
    return acc
  }, {} as Record<string, unknown>)

  const validationResult = schema.safeParse(values)

  if (!validationResult.success) {
    validationResult.error.errors.forEach(({ path, message, code }) => {
      // Runtime path built from the schema's own validation result — can't
      // be statically narrowed to react-hook-form's FieldPath literal union.
      form.setError(path.join(".") as FieldPath<TForm>, {
        type: code,
        message,
      })
    })

    return false
  }

  return true
}
