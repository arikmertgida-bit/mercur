export const defaultStoreReturnReasonFields = [
  "id",
  "value",
  "label",
  "parent_return_reason_id",
  "description",
  "created_at",
  "updated_at",
  "deleted_at",
  "*parent_return_reason",
  "*return_reason_children",
]

export const retrieveTransformQueryConfig = {
  defaults: defaultStoreReturnReasonFields,
  isList: false,
}

export const listTransformQueryConfig = {
  defaults: defaultStoreReturnReasonFields,
  defaultLimit: 20,
  isList: true,
}
