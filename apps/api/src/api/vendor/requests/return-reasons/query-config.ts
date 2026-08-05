export const defaultVendorReturnReasonRequestFields = [
  "id",
  "value",
  "label",
  "description",
  "custom_fields.*",
  "created_at",
  "updated_at",
]

export const retrieveTransformQueryConfig = {
  defaults: defaultVendorReturnReasonRequestFields,
  isList: false,
}

export const listTransformQueryConfig = {
  ...retrieveTransformQueryConfig,
  isList: true,
}
