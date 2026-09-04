import { model } from "@medusajs/framework/utils"

// A bounded (top-N) snapshot of a seller's lowest-stock inventory items,
// fully replaced on every compute-seller-analytics job run. Not a live
// query — see apps/api/src/jobs/compute-seller-analytics.ts.
const SellerLowStockItem = model.define("seller_low_stock_item", {
  id: model.id({ prefix: "slstock" }).primaryKey(),
  seller_id: model.text(),
  inventory_item_id: model.text(),
  product_title: model.text(),
  sku: model.text().nullable(),
  thumbnail: model.text().nullable(),
  available_quantity: model.number(),
  computed_at: model.dateTime(),
})

export default SellerLowStockItem
