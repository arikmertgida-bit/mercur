import { MedusaError } from "@medusajs/framework/utils"

/**
 * Workflow `when()` branches don't narrow the values their `transform`s read,
 * so a value the branch condition guarantees is re-checked here.
 */
export const ensureDefined = <T>(
  value: T | null | undefined,
  name: string
): T => {
  if (value === null || value === undefined) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `${name} is required`)
  }
  return value
}
