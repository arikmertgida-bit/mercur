import { model } from "@medusajs/framework/utils"

const ProductReport = model.define("product_report", {
  id: model.id().primaryKey(),
  product_id: model.text().index("idx_product_report_product_id"),
  customer_id: model.text().index("idx_product_report_customer_id"),
  reason: model.text(),
  comment: model.text(),
  status: model.enum(["pending", "resolved", "dismissed"]).default("pending").index("idx_product_report_status"),
})

export default ProductReport
