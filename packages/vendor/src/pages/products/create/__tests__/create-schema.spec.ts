import { describe, expect, it, vi } from "vitest"

import { i18n } from "../../../../components/utilities/i18n/i18n"
import { PRODUCT_CREATE_FORM_DEFAULTS, ProductCreateSchema } from "../constants"

const baseVariant = PRODUCT_CREATE_FORM_DEFAULTS.variants?.[0]

const parse = (prices: Record<string, number | "" | undefined>) =>
  ProductCreateSchema.safeParse({
    ...PRODUCT_CREATE_FORM_DEFAULTS,
    title: "Test",
    category_id: "pcat_1",
    origin_country: "tr",
    variants: [{ ...baseVariant, prices }],
  })

describe("ProductCreateSchema", () => {
  it("treats a price cell registered as undefined as blank, so the price/stock rules run", () => {
    const issues = parse({ try: undefined }).error?.issues ?? []
    const byPath = issues.map((issue) => [issue.path.join("."), issue.code])

    expect(byPath).not.toContainEqual(["variants.0.prices.try", "invalid_union"])
    expect(byPath).toContainEqual(["variants.0.prices", "custom"])
    expect(byPath).toContainEqual(["variants.0.inventory", "custom"])
  })

  it("resolves field messages when validating, not when the module loads", () => {
    const t = vi.spyOn(i18n, "t").mockImplementation(() => "translated now")
    const issue = parse({ try: 100 }).error?.issues.find(
      (candidate) => candidate.path.join(".") === "shipping_profile_id"
    )

    expect(issue?.message).toBe("translated now")
    expect(t).toHaveBeenCalledWith("products.create.errors.shippingProfileRequired")
    t.mockRestore()
  })
})
