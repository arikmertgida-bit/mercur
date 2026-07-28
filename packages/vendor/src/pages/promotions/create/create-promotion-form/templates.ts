const commonHiddenFields = [
  "type",
  "application_method.type",
  "application_method.allocation",
]

export const templates = [
  {
    id: "amount_off_products",
    type: "standard",
    titleKey: "promotions.templates.amountOffProducts.title",
    descriptionKey: "promotions.templates.amountOffProducts.description",
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
    hiddenFields: [...commonHiddenFields],
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
    type: "buy_get",
    titleKey: "promotions.templates.buyGet.title",
    descriptionKey: "promotions.templates.buyGet.description",
    hiddenFields: [...commonHiddenFields, "application_method.value"],
    defaults: {
      is_automatic: "false",
      type: "buyget",
      application_method: {
        type: "percentage",
        value: 100,
        apply_to_quantity: 1,
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
