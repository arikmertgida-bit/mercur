export const adminProductReportFields = [
  "id",
  "product_id",
  "customer_id",
  "reason",
  "comment",
  "status",
  "created_at",
  "updated_at",
]

export const adminProductReportQueryConfig = {
  list: {
    defaults: adminProductReportFields,
    defaultLimit: 20,
    isList: true,
  },
}
