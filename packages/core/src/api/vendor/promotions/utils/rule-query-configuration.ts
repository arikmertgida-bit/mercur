export type RuleQueryConfiguration = {
  entryPoint: string
  labelAttr: string
  valueAttr: string
  /**
   * Whether a `${entryPoint}_seller` remote-link entity actually exists
   * (see `packages/core/src/links`) and can be used to scope the value
   * options down to resources owned by the requesting seller. Entities
   * without a registered seller link are global/platform-owned reference
   * data (countries, currencies, regions, sales channels, product
   * collections/types/tags, shipping option types) — querying a
   * non-existent `${entryPoint}_seller` entity throws, so those must be
   * returned unscoped instead of joined through a seller link.
   */
  sellerScoped: boolean
}

export const ruleQueryConfigurations: Record<string, RuleQueryConfiguration> = {
  region: {
    entryPoint: "region",
    labelAttr: "name",
    valueAttr: "id",
    sellerScoped: false,
  },
  currency_code: {
    entryPoint: "currency",
    labelAttr: "name",
    valueAttr: "code",
    sellerScoped: false,
  },
  customer_group: {
    entryPoint: "customer_group",
    labelAttr: "name",
    valueAttr: "id",
    sellerScoped: true,
  },
  sales_channel: {
    entryPoint: "sales_channel",
    labelAttr: "name",
    valueAttr: "id",
    sellerScoped: false,
  },
  country: {
    entryPoint: "country",
    labelAttr: "display_name",
    valueAttr: "iso_2",
    sellerScoped: false,
  },
  product: {
    entryPoint: "product",
    labelAttr: "title",
    valueAttr: "id",
    sellerScoped: true,
  },
  product_category: {
    entryPoint: "product_category",
    labelAttr: "name",
    valueAttr: "id",
    sellerScoped: true,
  },
  product_collection: {
    entryPoint: "product_collection",
    labelAttr: "title",
    valueAttr: "id",
    sellerScoped: false,
  },
  product_type: {
    entryPoint: "product_type",
    labelAttr: "value",
    valueAttr: "id",
    sellerScoped: false,
  },
  product_tag: {
    entryPoint: "product_tag",
    labelAttr: "value",
    valueAttr: "id",
    sellerScoped: false,
  },
  shipping_option_type: {
    entryPoint: "shipping_option_type",
    labelAttr: "label",
    valueAttr: "id",
    sellerScoped: false,
  },
}
