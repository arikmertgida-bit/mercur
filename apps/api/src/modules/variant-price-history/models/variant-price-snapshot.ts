import { model } from "@medusajs/framework/utils"

const VariantPriceSnapshot = model.define("variant_price_snapshot", {
  id: model.id().primaryKey(),
  variant_id: model.text(),
  seller_id: model.text(),
  currency_code: model.text(),
  amount: model.number(),
  // "YYYY-MM-DD" — one row per variant per day, compared with the daily job's
  // idempotency check and the 10-day reference-price floor query.
  captured_date: model.text(),
})

export default VariantPriceSnapshot
