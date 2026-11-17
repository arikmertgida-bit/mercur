// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { HttpTypes } from "@mercurjs/types"
import { ReactNode } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PromotionRulesFormValues } from "../../../form-values"
import { RulesFormField } from "../rules-form-field"

const rulesState: { current: HttpTypes.AdminPromotionRuleDetail[] } = {
  current: [],
}

vi.mock("../../../../../../../hooks/api/promotions", () => ({
  usePromotionRules: () => ({ rules: rulesState.current, isLoading: false }),
  usePromotionRuleAttributes: () => ({ attributes: [] }),
}))

vi.mock("../../rule-value-form-field", () => ({
  RuleValueFormField: (): null => null,
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string): string => key }),
}))

const customerGroupRule = (id: string): HttpTypes.AdminPromotionRuleDetail => ({
  id,
  attribute: "customer.groups.id",
  operator: "in",
  required: false,
  values: [{ value: "cg_1" }],
})

const Harness = ({
  formType,
}: {
  formType: "create" | "edit"
}): ReactNode => {
  const form = useForm<PromotionRulesFormValues>({
    defaultValues: {
      type: "standard",
      rules: [],
      application_method: { type: "percentage", target_type: "items" },
    },
  })

  return (
    <FormProvider {...form}>
      <RulesFormField ruleType="rules" formType={formType} />
    </FormProvider>
  )
}

const ruleRows = (): HTMLElement[] =>
  screen.queryAllByTestId(/^rules-form-field-rule-rules-\d+$/)

const settle = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

describe("RulesFormField seeding", () => {
  beforeEach(() => {
    rulesState.current = [customerGroupRule("rule_1")]
  })

  afterEach(() => {
    cleanup()
  })

  it.each(["create", "edit"] as const)(
    "keeps the list empty after Clear all (%s)",
    async (formType) => {
      render(<Harness formType={formType} />)
      await settle()
      expect(ruleRows()).toHaveLength(1)

      fireEvent.click(screen.getByTestId("rules-form-field-clear-all-button-rules"))
      await settle()
      await settle()

      expect(ruleRows()).toHaveLength(0)
    }
  )

  it("seeds again when the rules response changes", async () => {
    const view = render(<Harness formType="create" />)
    await settle()

    fireEvent.click(screen.getByTestId("rules-form-field-clear-all-button-rules"))
    await settle()
    expect(ruleRows()).toHaveLength(0)

    rulesState.current = [customerGroupRule("rule_2")]
    view.rerender(<Harness formType="create" />)
    await settle()

    expect(ruleRows()).toHaveLength(1)
  })
})
