import { describe, expect, it, vi } from "vitest"

import { i18n } from "../../../../components/utilities/i18n/i18n"
import { PRODUCT_CREATE_FORM_DEFAULTS, ProductCreateSchema } from "../constants"

const baseVariant = PRODUCT_CREATE_FORM_DEFAULTS.variants?.[0]

const parse = (title: string, prices: Record<string, number | "" | undefined>) =>
  ProductCreateSchema.safeParse({
    ...PRODUCT_CREATE_FORM_DEFAULTS,
    title,
    category_id: "pcat_1",
    variants: [{ ...baseVariant, prices }],
  })

describe("ProductCreateSchema", () => {
  it("treats a price cell registered as undefined as blank", () => {
    const codes = (parse("Test", { try: undefined }).error?.issues ?? []).map(
      (issue) => [issue.path.join("."), issue.code]
    )

    expect(codes).not.toContainEqual(["variants.0.prices.try", "invalid_union"])
  })

  it("resolves field messages when validating, not when the module loads", () => {
    const t = vi.spyOn(i18n, "t").mockImplementation(() => "translated now")
    const issue = parse("", { try: 100 }).error?.issues.find(
      (candidate) => candidate.path.join(".") === "title"
    )

    expect(issue?.message).toBe("translated now")
    expect(t).toHaveBeenCalledWith("products.create.errors.requiredTitle")
    t.mockRestore()
  })
})
