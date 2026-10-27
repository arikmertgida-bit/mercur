import { PromotionRuleDTO } from "@medusajs/types"
import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { useLinkQuery, useRequiredParam } from "@mercurjs/dashboard-shared"
import { z } from "zod"

import { RouteDrawer } from "../../../../components/modals"
import { usePromotion } from "../../../../hooks/api/promotions"
import { PROMOTION_DETAIL_BASE_FIELDS } from "../../promotion-detail/loader"
import { EditRulesWrapper } from "./components/edit-rules-wrapper"

export const RuleType = {
  RULES: "rules",
  BUY_RULES: "buy-rules",
  TARGET_RULES: "target-rules",
} as const
export type RuleTypeValues = (typeof RuleType)[keyof typeof RuleType]

const RuleTypeSchema = z.enum(RuleType)

export const EditRules = () => {
  const params = useParams()
  const parsedRuleType = RuleTypeSchema.safeParse(params.ruleType)

  if (!parsedRuleType.success) {
    throw "invalid page"
  }

  const { t } = useTranslation()
  const ruleType = parsedRuleType.data
  const id = useRequiredParam("id")
  const rules: PromotionRuleDTO[] = []
  const linkQuery = useLinkQuery("promotion", PROMOTION_DETAIL_BASE_FIELDS)
  const { promotion, isPending: isLoading, isError, error } = usePromotion(
    id,
    linkQuery
  )

  if (promotion) {
    if (ruleType === RuleType.RULES) {
      rules.push(...(promotion.rules || []))
    } else if (ruleType === RuleType.TARGET_RULES) {
      rules.push(...(promotion?.application_method?.target_rules || []))
    } else if (ruleType === RuleType.BUY_RULES) {
      rules.push(...(promotion.application_method?.buy_rules || []))
    }
  }

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer data-testid={`promotion-edit-rules-${ruleType}`}>
      <RouteDrawer.Header data-testid={`promotion-edit-rules-header-${ruleType}`}>
        <RouteDrawer.Title asChild>
          <Heading data-testid={`promotion-edit-rules-heading-${ruleType}`}>{t(`promotions.edit.${ruleType}.title`)}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>

      {!isLoading && promotion && (
        <EditRulesWrapper
          promotion={promotion}
          rules={rules}
          ruleType={ruleType}
        />
      )}
    </RouteDrawer>
  )
}
