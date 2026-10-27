import {
  CurrencyInput,
  DatePicker,
  Divider,
  Heading,
  Input,
  RadioGroup,
  Select,
  Text,
  Textarea,
} from "@medusajs/ui"
import { useEffect } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { toHandle } from "@mercurjs/dashboard-shared"

import { Form } from "@components/common/form"
import { Combobox, getSingleComboboxValue } from "@components/inputs/combobox"
import { HandleInput } from "@components/inputs/handle-input"
import { useCurrentSeller } from "@hooks/api/sellers"
import {
  currencies,
  getCurrencySymbol,
} from "@lib/data/currencies"
import { getLocalizedCurrencyName } from "@lib/format-currency-name"
import { CampaignFieldsFormValues } from "../../schema"

type CreateCampaignFormFieldsProps = {
  /**
   * Set when the campaign is created from the promotion flow: the budget
   * currency then follows the promotion's currency instead of being picked.
   */
  syncPromotionCurrency?: boolean
}

/**
 * Renders inside the host form's RHF provider; the host keeps the campaign
 * under `campaign` (see `CampaignFieldsFormValues`).
 */
export const CreateCampaignFormFields = ({
  syncPromotionCurrency = false,
}: CreateCampaignFormFieldsProps) => {
  const form = useFormContext<CampaignFieldsFormValues>()
  const { t, i18n } = useTranslation()
  const { currency_code: sellerCurrencyCode } = useCurrentSeller()

  const watchNameValue = useWatch({
    control: form.control,
    name: "campaign.name",
  })

  useEffect(() => {
    form.setValue("campaign.campaign_identifier", toHandle(watchNameValue ?? ""), {
      shouldValidate: true,
      shouldDirty: false,
    })
  }, [watchNameValue, form.setValue])

  const watchValueType = useWatch({
    control: form.control,
    name: "campaign.budget.type",
  })

  const isTypeSpend = watchValueType === "spend"

  const currencyValue = useWatch({
    control: form.control,
    name: "campaign.budget.currency_code",
  })

  const promotionCurrencyValue = useWatch({
    control: form.control,
    name: "application_method.currency_code",
  })

  const currency = currencyValue || promotionCurrencyValue

  useEffect(() => {
    form.resetField("campaign.budget.limit")

    if (syncPromotionCurrency) {
      form.setValue(
        "campaign.budget.currency_code",
        isTypeSpend ? promotionCurrencyValue : null
      )
    }
  }, [watchValueType, syncPromotionCurrency, form.resetField, form.setValue, isTypeSpend, promotionCurrencyValue])

  if (promotionCurrencyValue && syncPromotionCurrency) {
    const budget = form.getValues().campaign?.budget

    if (
      budget?.type === "spend" &&
      budget?.currency_code !== promotionCurrencyValue
    ) {
      form.setValue("campaign.budget.currency_code", promotionCurrencyValue)
    }
  }

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-y-8">
      <div>
        <Heading>{t("campaigns.create.header")}</Heading>

        <Text size="small" className="text-ui-fg-subtle">
          {t("campaigns.create.hint")}
        </Text>
      </div>

      <div className="flex flex-col gap-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Field
            control={form.control}
            name="campaign.name"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label>{t("fields.name")}</Form.Label>

                  <Form.Control>
                    <Input {...field} value={field.value ?? ""} />
                  </Form.Control>

                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />

          <Form.Field
            control={form.control}
            name="campaign.campaign_identifier"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label tooltip={t("campaigns.fields.identifierTooltip")}>
                    {t("campaigns.fields.identifier")}
                  </Form.Label>

                  <Form.Control>
                    <HandleInput
                      {...field}
                      value={field.value ?? ""}
                      disabled
                      placeholder={t("campaigns.fields.identifierPlaceholder")}
                    />
                  </Form.Control>

                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
        </div>

        <Form.Field
          control={form.control}
          name="campaign.description"
          render={({ field }) => {
            return (
              <Form.Item>
                <Form.Label optional>{t("fields.description")}</Form.Label>

                <Form.Control>
                  <Textarea {...field} value={field.value ?? ""} />
                </Form.Control>

                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Form.Field
          control={form.control}
          name="campaign.starts_at"
          render={({ field }) => {
            return (
              <Form.Item>
                <Form.Label optional>
                  {t("campaigns.fields.start_date")}
                </Form.Label>

                <Form.Control>
                  <DatePicker
                    granularity="minute"
                    shouldCloseOnSelect={false}
                    {...field}
                  />
                </Form.Control>

                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />

        <Form.Field
          control={form.control}
          name="campaign.ends_at"
          render={({ field }) => {
            return (
              <Form.Item>
                <Form.Label optional>
                  {t("campaigns.fields.end_date")}
                </Form.Label>

                <Form.Control>
                  <DatePicker
                    granularity="minute"
                    shouldCloseOnSelect={false}
                    {...field}
                  />
                </Form.Control>

                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
      </div>

      <Divider variant="dashed" data-testid="campaign-create-form-fields-budget-divider" />

      <div data-testid="campaign-create-form-fields-budget-header">
        <Heading>{t("campaigns.budget.create.header")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("campaigns.budget.create.hint")}
        </Text>
      </div>

      <Form.Field
        control={form.control}
        name="campaign.budget.type"
        render={({ field }) => {
          return (
            <Form.Item>
              <Form.Label
                tooltip={
                  syncPromotionCurrency && !currency
                    ? t("promotions.tooltips.campaignType")
                    : undefined
                }
              >
                {t("campaigns.budget.fields.type")}
              </Form.Label>

              <Form.Control>
                <RadioGroup
                  className="grid grid-cols-2 gap-4"
                  {...field}
                  onValueChange={field.onChange}
                >
                  <RadioGroup.ChoiceBox
                    value={"usage"}
                    label={t("campaigns.budget.type.usage.title")}
                    description={t("campaigns.budget.type.usage.description")}
                  />

                  <RadioGroup.ChoiceBox
                    value={"spend"}
                    label={t("campaigns.budget.type.spend.title")}
                    description={t("campaigns.budget.type.spend.description")}
                    disabled={syncPromotionCurrency ? !currency : false}
                  />
                </RadioGroup>
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )
        }}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {isTypeSpend && (
          <Form.Field
            control={form.control}
            name="campaign.budget.currency_code"
            render={({ field: { onChange, ref, ...field } }) => {
              return (
                <Form.Item>
                  <Form.Label
                    tooltip={
                      syncPromotionCurrency && !currency
                        ? t("promotions.campaign_currency.tooltip")
                        : undefined
                    }
                  >
                    {t("fields.currency")}
                  </Form.Label>
                  <Form.Control>
                    <Select
                      {...field}
                      value={field.value ?? ""}
                      onValueChange={onChange}
                      disabled={syncPromotionCurrency}
                    >
                      <Select.Trigger ref={ref} className="w-full">
                        <Select.Value
                          placeholder={t("campaigns.budget.fields.selectCurrency")}
                        />
                      </Select.Trigger>

                      <Select.Content>
                        {Object.values(currencies)
                          .filter(
                            (currency) =>
                              !!sellerCurrencyCode &&
                              currency.code.toLowerCase() ===
                                sellerCurrencyCode.toLowerCase()
                          )
                          .map((currency) => (
                            <Select.Item
                              value={currency.code.toLowerCase()}
                              key={currency.code}
                            >
                              {getLocalizedCurrencyName(
                                currency.code,
                                i18n.language,
                              )}
                            </Select.Item>
                          ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
        )}

        <Form.Field
          control={form.control}
          name="campaign.budget.limit"
          render={({ field: { onChange, value, ...field } }) => {
            return (
              <Form.Item>
                <Form.Label
                  optional
                  tooltip={
                    !currency && isTypeSpend
                      ? t("promotions.fields.amount.tooltip")
                      : undefined
                  }
                >
                  {t("campaigns.budget.fields.limit")}
                </Form.Label>

                <Form.Control>
                  {isTypeSpend ? (
                    <CurrencyInput
                      min={0}
                      onValueChange={(value) =>
                        onChange(value ? parseInt(value) : "")
                      }
                      code={currencyValue ?? ""}
                      symbol={
                        currencyValue ? getCurrencySymbol(currencyValue) : ""
                      }
                      {...field}
                      value={value ?? undefined}
                      disabled={!currency && isTypeSpend}
                    />
                  ) : (
                    <Input
                      type="number"
                      key="usage"
                      {...field}
                      min={0}
                      value={value ?? ""}
                      onChange={(e) => {
                        onChange(
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value)
                        )
                      }}
                    />
                  )}
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />

        {!isTypeSpend && (
          <Form.Field
            control={form.control}
            name="campaign.budget.attribute"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label
                    optional
                    tooltip={t("campaigns.budget.fields.budgetAttributeTooltip")}
                  >
                    {t("campaigns.budget.fields.budgetAttribute")}
                  </Form.Label>

                  <Form.Control>
                    <Combobox
                      className="w-full"
                      key="attribute"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(next) => {
                        field.onChange(getSingleComboboxValue(next) ?? null)
                      }}
                      allowClear
                      options={[
                        { label: t("fields.customer"), value: "customer_id" },
                        { label: t("fields.email"), value: "customer_email" },
                        {
                          label: t("fields.promotionCode"),
                          value: "promotion_code",
                        },
                      ]}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
        )}
      </div>

      <Text size="small" className="text-ui-fg-subtle">
        {t("campaigns.budget.noLimitHint")}
      </Text>
    </div>
  )
}
