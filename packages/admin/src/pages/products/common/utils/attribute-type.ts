import { AttributeType } from "@mercurjs/types"
import { z } from "zod"

const AttributeTypeSchema = z.enum(AttributeType)

/** Narrows an attribute type string (form row or API) to a known type. */
export const toAttributeType = (
  type: string | null | undefined
): AttributeType | undefined => {
  const parsed = AttributeTypeSchema.safeParse(type)

  return parsed.success ? parsed.data : undefined
}

/** The empty form value of an attribute row of the given type. */
export const getEmptyAttributeValue = (
  type: string | null | undefined
): string | string[] =>
  type === AttributeType.MULTI_SELECT
    ? []
    : type === AttributeType.TOGGLE
      ? "false"
      : ""
