declare const __STOREFRONT_URL__: string

export const MEDUSA_STOREFRONT_URL: string =
  (typeof __STOREFRONT_URL__ !== "undefined" ? __STOREFRONT_URL__ : null) ??
  "http://localhost:3000"
