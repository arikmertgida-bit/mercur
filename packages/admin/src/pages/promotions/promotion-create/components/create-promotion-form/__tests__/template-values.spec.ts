import { describe, expect, it } from "vitest"

import { applyTemplateDefaults, PromotionFormDefaults } from "../template-values"
import { templates } from "../templates"

const base: PromotionFormDefaults = {
  template_id: "base",
  is_automatic: "false",
  type: "standard",
  rules: [],
  application_method: {
    allocation: "each",
    type: "fixed",
    target_type: "items",
    max_quantity: 1,
    target_rules: [],
    buy_rules: [],
  },
}

describe("applyTemplateDefaults", () => {
  it.each(templates.map((template) => [template.id, template] as const))(
    "applies the %s template on top of the base values",
    (_id, template) => {
      const values = applyTemplateDefaults(base, template)
      const preset = template.defaults.application_method

      expect(values.template_id).toBe(template.id)
      expect(values.is_automatic).toBe(template.defaults.is_automatic)
      expect(values.type).toBe(template.defaults.type)
      expect(values.rules).toEqual([])
      expect(values.application_method?.target_rules).toEqual([])
      expect(values.application_method?.allocation).toBe(
        preset.allocation ?? "each"
      )
      expect(values.application_method?.type).toBe(preset.type ?? "fixed")
      expect(values.application_method?.target_type).toBe(
        preset.target_type ?? "items"
      )
      expect(values.application_method?.value).toBe(preset.value)
      expect(values.application_method?.max_quantity).toBe(
        preset.allocation === "across" ? null : (preset.max_quantity ?? 1)
      )
    }
  )

  it("does not mutate the base values", () => {
    const template = templates.find(
      ({ defaults }) => defaults.application_method.allocation === "across"
    )
    expect(template).toBeDefined()
    if (!template) {
      return
    }

    applyTemplateDefaults(base, template)

    expect(base.application_method?.max_quantity).toBe(1)
    expect(base.template_id).toBe("base")
  })
})
