import { Children, ReactNode, useEffect, useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "@medusajs/ui"
import { DeepPartial, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { useRouteModal } from "../../../../../components/modals"
import { TabbedForm } from "../../../../../components/tabbed-form/tabbed-form"
import {
  useCreatePromotion,
  useUpsertPromotionCost,
} from "../../../../../hooks/api/promotions"
import { DEFAULT_CAMPAIGN_VALUES } from "../../../../campaigns/common/constants"
import { getRuleValue } from "../../../common/edit-rules/components/edit-rules-wrapper/utils"
import { PromotionRuleRow } from "../../../common/edit-rules/form-values"
import {
  toPromotionRuleOperator,
  toRuleValues,
} from "../../../common/edit-rules/rule-payload"
import { CreatePromotionSchema, CreatePromotionSchemaType } from "./form-schema"
import { PromotionCampaignTab } from "./promotion-campaign-tab"
import { PromotionDetailsTab } from "./promotion-details-tab"
import { PromotionTemplateTab } from "./promotion-template-tab"
import { templates } from "./templates"

const PROMOTION_CREATE_DEFAULTS = {
  campaign_id: undefined,
  template_id: templates[0]?.id,
  campaign_choice: "none",
  is_automatic: "false",
  code: "",
  type: "standard",
  status: "draft",
  rules: [],
  is_tax_inclusive: false,
  limit: undefined,
  cost_bearer: "store",
  shared_marketplace_percentage: null,
  application_method: {
    allocation: "each",
    type: "fixed",
    target_type: "items",
    max_quantity: 1,
    target_rules: [],
    buy_rules: [],
  },
  campaign: undefined,
} satisfies DeepPartial<CreatePromotionSchemaType>

type CreatePromotionFormProps = {
  children?: ReactNode
  schema?: typeof CreatePromotionSchema
  defaultValues?: DeepPartial<CreatePromotionSchemaType>
}

export function CreatePromotionForm({
  children,
  schema,
  defaultValues: extraDefaults,
}: CreatePromotionFormProps) {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const form = useForm<CreatePromotionSchemaType>({
    defaultValues: {
      ...PROMOTION_CREATE_DEFAULTS,
      ...extraDefaults,
    },
    resolver: zodResolver(schema ?? CreatePromotionSchema),
  })
  const { setValue, reset, getValues } = form

  const { mutateAsync: createPromotion, isPending: isLoading } =
    useCreatePromotion()
  const { mutateAsync: upsertPromotionCost } = useUpsertPromotionCost()

  const handleSubmit = form.handleSubmit(
    async (data) => {
      if (data.campaign_choice === "existing" && !data.campaign_id) {
        form.setError("campaign_id", {
          message: t("promotions.errors.requiredField"),
        })
        return
      }
      const {
        campaign_choice: _campaignChoice,
        is_automatic,
        is_tax_inclusive,
        cost_bearer,
        shared_marketplace_percentage,
        template_id: _templateId,
        seller_id: _sellerId,
        application_method,
        rules,
        ...promotionData
      } = data
      const {
        target_rules: targetRulesData = [],
        buy_rules: buyRulesData = [],
        ...applicationMethodData
      } = application_method
      const allocation = applicationMethodData.allocation

      const disguisedRules = [
        ...targetRulesData.filter((r) => !!r.disguised),
        ...buyRulesData.filter((r) => !!r.disguised),
        ...rules.filter((r) => !!r.disguised),
      ]

      const applicationMethodRuleData: Record<
        string,
        string | number | string[]
      > = {}

      for (const rule of disguisedRules) {
        applicationMethodRuleData[rule.attribute] = getRuleValue(rule)
      }

      const buildRulesData = (rules: PromotionRuleRow[]) => {
        return rules
          .filter((r) => !r.disguised)
          .flatMap((rule) => {
            const operator = toPromotionRuleOperator(rule.operator)

            return operator
              ? [
                  {
                    operator,
                    attribute: rule.attribute,
                    values: toRuleValues(rule.values),
                  },
                ]
              : []
          })
      }

      if (data.campaign) {
        data.campaign.budget.attribute =
          data.campaign.budget.attribute || null
        data.campaign.budget.type = data.campaign.budget.attribute
          ? "use_by_attribute"
          : data.campaign.budget.type
      }

      await createPromotion(
        {
          ...promotionData,
          rules: buildRulesData(rules),
          application_method: {
            ...applicationMethodData,
            allocation,
            ...applicationMethodRuleData,
            value:
              typeof applicationMethodData.value === "number"
                ? applicationMethodData.value
                : parseFloat(applicationMethodData.value),
            target_rules: buildRulesData(targetRulesData),
            buy_rules: buildRulesData(buyRulesData),
            max_quantity:
              allocation === "across"
                ? undefined
                : applicationMethodData.max_quantity,
          },
          is_tax_inclusive,
          is_automatic: is_automatic === "true",
        },
        {
          onSuccess: async ({ promotion }) => {
            try {
              await upsertPromotionCost({
                id: promotion.id,
                cost_bearer,
                shared_marketplace_percentage:
                  cost_bearer === "shared"
                    ? shared_marketplace_percentage
                    : null,
              })
            } catch (e) {
              toast.error((e instanceof Error ? e.message : String(e)))
            }

            toast.success(
              t("promotions.toasts.promotionCreateSuccess", {
                code: promotion.code,
              })
            )

            handleSuccess(`/promotions/${promotion.id}`)
          },
          onError: (e) => {
            toast.error(e.message)
          },
        }
      )
    },
    async (error) => {
      const { campaign: _campaign, ...rest } = error || {}
      const errorInPromotionTab = !!Object.keys(rest || {}).length

      if (errorInPromotionTab) {
        toast.error(t("promotions.errors.promotionTabError"))
      }
    }
  )

  // Template selection: reset form and apply template defaults
  const watchTemplateId = useWatch({
    control: form.control,
    name: "template_id",
  })

  const currentTemplate = useMemo(() => {
    const currentTemplate = templates.find(
      (template) => template.id === watchTemplateId
    )

    if (!currentTemplate) {
      return
    }

    reset({
      ...PROMOTION_CREATE_DEFAULTS,
      ...extraDefaults,
      template_id: watchTemplateId,
    })

    const { is_automatic, type, application_method } = currentTemplate.defaults

    setValue("is_automatic", is_automatic)
    setValue("type", type)

    if (application_method.allocation !== undefined) {
      setValue("application_method.allocation", application_method.allocation)
    }
    if (application_method.target_type !== undefined) {
      setValue("application_method.target_type", application_method.target_type)
    }
    if (application_method.type !== undefined) {
      setValue("application_method.type", application_method.type)
    }
    if (application_method.value !== undefined) {
      setValue("application_method.value", application_method.value)
    }
    if (application_method.max_quantity !== undefined) {
      setValue("application_method.max_quantity", application_method.max_quantity)
    }

    // `across` allocation forbids max_quantity, but the reset above restores the
    // default of 1; null it so the payload is valid for order-scoped templates.
    if (application_method.allocation === "across") {
      setValue("application_method.max_quantity", null)
    }

    return currentTemplate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchTemplateId, setValue, reset])

  // Campaign choice effects
  const watchCampaignChoice = useWatch({
    control: form.control,
    name: "campaign_choice",
  })

  useEffect(() => {
    const formData = getValues()

    if (watchCampaignChoice !== "existing") {
      setValue("campaign_id", undefined)
      form.clearErrors("campaign_id")
    }

    if (watchCampaignChoice !== "new") {
      setValue("campaign", undefined)
    }

    if (watchCampaignChoice === "new") {
      if (!formData.campaign || !formData.campaign?.budget?.type) {
        setValue("campaign", {
          ...DEFAULT_CAMPAIGN_VALUES,
          budget: {
            ...DEFAULT_CAMPAIGN_VALUES.budget,
            currency_code: formData.application_method.currency_code,
          },
        })
      }
    }
  }, [watchCampaignChoice, getValues, setValue, form])

  // Currency rule syncing
  const watchRules = useWatch({
    control: form.control,
    name: "rules",
  })

  const watchCurrencyRule = watchRules.find(
    (rule) => rule.attribute === "currency_code"
  )

  if (watchCurrencyRule) {
    const formData = form.getValues()
    const currencyCode = formData.application_method.currency_code
    const ruleValue = watchCurrencyRule.values

    if (typeof ruleValue === "string" && currencyCode !== ruleValue) {
      form.setValue("application_method.currency_code", ruleValue)
    }
  }

  const defaultTabs = useMemo(
    () => [
      <PromotionTemplateTab key="type" />,
      <PromotionDetailsTab key="promotion" currentTemplate={currentTemplate} />,
      <PromotionCampaignTab key="campaign" />,
    ],
    [currentTemplate]
  )

  const hasCustomChildren = Children.count(children) > 0

  return (
    <TabbedForm
      model="promotion"
      zone="create"
      form={form}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    >
      {hasCustomChildren ? children : defaultTabs}
    </TabbedForm>
  )
}

export type { CreatePromotionSchemaType }
