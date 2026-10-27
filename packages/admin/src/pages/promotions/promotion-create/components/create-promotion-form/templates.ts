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
  type: string
  titleKey: string
  descriptionKey: string
  hiddenFields: string[]
  defaults: PromotionTemplateDefaults
}

const commonHiddenFields = [
  "type",
  "application_method.type",
]

const amountOfOrderHiddenFields = [
  ...commonHiddenFields,
  "application_method.allocation",
]
const amountOfProductHiddenFields = [...commonHiddenFields]

const percentageOfOrderHiddenFields = [
  ...commonHiddenFields,
  "is_tax_inclusive",
  "application_method.allocation",
]
const percentageOfProductHiddenFields = [
  ...commonHiddenFields,
  "is_tax_inclusive",
]

const buyGetHiddenFields = [
  ...commonHiddenFields,
  "application_method.value",
  "is_tax_inclusive",
]

export const templates: PromotionTemplate[] = [
  {
    id: "amount_off_products",
    type: "standard",
    titleKey: "promotions.templates.amountOffProducts.title",
    descriptionKey: "promotions.templates.amountOffProducts.description",
    hiddenFields: amountOfProductHiddenFields,
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
    hiddenFields: amountOfOrderHiddenFields,
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
    hiddenFields: percentageOfProductHiddenFields,
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
    hiddenFields: percentageOfOrderHiddenFields,
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
    type: "buy_get",
    titleKey: "promotions.templates.buyGet.title",
    descriptionKey: "promotions.templates.buyGet.description",
    hiddenFields: buyGetHiddenFields,
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
]
