import type { CartPromotionFacts } from "../cart-discount"

export const NOW = Date.parse("2026-11-16T12:00:00.000Z")
export const HOUR = 60 * 60 * 1000

export function iso(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString()
}

type Method = NonNullable<CartPromotionFacts["method"]>
export type FactsOverrides = Omit<Partial<CartPromotionFacts>, "method"> &
  Pick<CartPromotionFacts, "id"> & {
    method?: (Omit<Method, "buy_rules_min_quantity" | "apply_to_quantity"> &
      Partial<Pick<Method, "buy_rules_min_quantity" | "apply_to_quantity">>) | null
  }

export function facts({ method, ...overrides }: FactsOverrides): CartPromotionFacts {
  const base = method === undefined
    ? { type: "percentage", target_type: "items", value: 10, currency_code: null }
    : method
  return {
    status: "active",
    type: "standard",
    is_automatic: true,
    rule_count: 0,
    limit: null,
    used: 0,
    campaign: { starts_at: iso(-HOUR), ends_at: iso(HOUR), budget: null },
    ...overrides,
    method: base && { buy_rules_min_quantity: null, apply_to_quantity: null, ...base },
  }
}
