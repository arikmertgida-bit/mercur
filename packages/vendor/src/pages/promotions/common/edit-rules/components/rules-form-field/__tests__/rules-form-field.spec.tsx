// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { HttpTypes } from "@mercurjs/types"
import { ReactNode } from "react"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PromotionRulesFormValues } from "../../../form-values"
import { RulesFormField } from "../rules-form-field"

const rulesState: { current: HttpTypes.VendorPromotionRuleDetail[] } = {
  current: [],
}

vi.mock("../../../../../../../hooks/api", () => ({
  usePromotionRules: () => ({ rules: rulesState.current, isLoading: false }),
  usePromotionRuleAttributes: () => ({ attributes: [] }),
}))

vi.mock("../../rule-value-form-field", () => ({
  RuleValueFormField: (): null => null,
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string): string => key }),
}))

const RuleCount = (): ReactNode => {
  const rules = useWatch<PromotionRulesFormValues, "rules">({ name: "rules" })
  return <output data-testid="rule-count">{rules.length}</output>
}

const Harness = (): ReactNode => {
  const form = useForm<PromotionRulesFormValues>({
    defaultValues: {
      type: "standard",
      rules: [],
      application_method: { type: "percentage", target_type: "items" },
    },
  })

  return (
    <FormProvider {...form}>
      <RulesFormField ruleType="rules" />
      <RuleCount />
    </FormProvider>
  )
}

const ruleCount = (): string | null =>
  screen.getByTestId("rule-count").textContent

const settle = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

describe("RulesFormField seeding", () => {
  beforeEach(() => {
    rulesState.current = [
      {
        id: "rule_1",
        attribute: "customer.groups.id",
        operator: "in",
        required: false,
        values: [{ value: "cg_1" }],
      },
    ]
  })

  afterEach(() => {
    cleanup()
  })

  it("seeds once and keeps the list empty after Clear all", async () => {
    render(<Harness />)
    await settle()
    expect(ruleCount()).toBe("1")

    fireEvent.click(screen.getByText("promotions.fields.clearAll"))
    await settle()
    await settle()

    expect(ruleCount()).toBe("0")
  })
})
