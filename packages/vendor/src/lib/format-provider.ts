import { TFunction } from "i18next"

/**
 * Providers only have an ID to identify them. This function formats the ID
 * into a human-readable string.
 *
 * Format example: pp_stripe-blik_dkk
 *
 * Segments that are generic infrastructure words (Medusa's built-in
 * "system"/"manual" providers, "default"/"test" configs) are translated —
 * everything else is treated as a provider's own brand name and only
 * capitalized, since brand names aren't translated.
 *
 * @param id - The ID of the provider
 * @param t - Translation function, used for the known generic tokens
 * @returns A formatted string
 */
const KNOWN_PROVIDER_TOKENS: Record<string, string> = {
  system: "providers.tokens.system",
  default: "providers.tokens.default",
  manual: "providers.tokens.manual",
  test: "providers.tokens.test",
}

const capitalize = (segment: string) =>
  segment.charAt(0).toUpperCase() + segment.slice(1)

const translateToken = (segment: string, t: TFunction): string => {
  const key = KNOWN_PROVIDER_TOKENS[segment.toLowerCase()]
  return key ? t(key) : capitalize(segment)
}

export const formatProvider = (id: string, t: TFunction): string => {
  const [_, name, type] = id.split("_")

  const translatedName = name
    .split("-")
    .map((segment) => translateToken(segment, t))
    .join(" ")

  if (!type) {
    return translatedName
  }

  const typeKey = KNOWN_PROVIDER_TOKENS[type.toLowerCase()]
  const translatedType = typeKey ? t(typeKey) : type.toUpperCase()

  return `${translatedName} (${translatedType})`
}
