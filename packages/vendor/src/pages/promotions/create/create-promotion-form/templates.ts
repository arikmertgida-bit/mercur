import { CreatePromotionSchemaType } from "./form-schema"

type ApplicationMethodValues = CreatePromotionSchemaType["application_method"]

/** The form values a template presets when it is picked. */
type PromotionTemplateDefaults = {
  is_automatic: string
  type: CreatePromotionSchemaType["type"]
  application_method: Partial<
    Pick<
      ApplicationMethodValues,
      "allocation" | "target_type" | "type" | "value" | "max_quantity"
    >
  >
}

export type PromotionTemplate = {
  id: string
  type: CreatePromotionSchemaType["type"]
  titleKey: string
  descriptionKey: string
  hiddenFields: string[]
  defaults: PromotionTemplateDefaults
}

const commonHiddenFields = ["type", "application_method.type"]

export const templates: PromotionTemplate[] = [
  {
    id: "amount_off_offers",
    type: "standard",
    titleKey: "promotions.templates.amountOffOffers.title",
    descriptionKey: "promotions.templates.amountOffOffers.description",
    hiddenFields: [...commonHiddenFields],
    defaults: {
      is_automatic: "false",
      type: "standard",
      application_method: {
        allocation: "each",
        target_type: "items",
        type: "fixed",
      },
    },
  },
  {
    id: "amount_off_order",
    type: "standard",
    titleKey: "promotions.templates.amountOffOrder.title",
    descriptionKey: "promotions.templates.amountOffOrder.description",
    hiddenFields: [...commonHiddenFields],
    defaults: {
      is_automatic: "false",
      type: "standard",
      application_method: {
        allocation: "across",
        target_type: "order",
        type: "fixed",
      },
    },
  },
  {
    id: "percentage_off_product",
    type: "standard",
    titleKey: "promotions.templates.percentageOffProduct.title",
    descriptionKey: "promotions.templates.percentageOffProduct.description",
    hiddenFields: [...commonHiddenFields, "is_tax_inclusive"],
    defaults: {
      is_automatic: "false",
      type: "standard",
      application_method: {
        allocation: "each",
        target_type: "items",
        type: "percentage",
      },
    },
  },
  {
    id: "percentage_off_order",
    type: "standard",
    titleKey: "promotions.templates.percentageOffOrder.title",
    descriptionKey: "promotions.templates.percentageOffOrder.description",
    hiddenFields: [...commonHiddenFields],
    defaults: {
      is_automatic: "false",
      type: "standard",
      application_method: {
        allocation: "across",
        target_type: "order",
        type: "percentage",
      },
    },
  },
  {
    id: "buy_get",
    type: "buyget",
    titleKey: "promotions.templates.buyGet.title",
    descriptionKey: "promotions.templates.buyGet.description",
    hiddenFields: [
      ...commonHiddenFields,
      "application_method.value",
      "application_method.allocation",
      "is_tax_inclusive",
    ],
    defaults: {
      is_automatic: "false",
      type: "buyget",
      application_method: {
        type: "percentage",
        value: 100,
        max_quantity: 1,
      },
    },
  },
  {
    id: "shipping_discount",
    type: "standard",
    titleKey: "promotions.templates.freeShipping.title",
    descriptionKey: "promotions.templates.freeShipping.description",
    hiddenFields: [...commonHiddenFields, "application_method.value"],
    defaults: {
      is_automatic: "false",
      type: "standard",
      application_method: {
        allocation: "across",
        target_type: "shipping_methods",
        type: "percentage",
        value: 100,
      },
    },
  },
]
