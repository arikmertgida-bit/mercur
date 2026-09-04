import { model } from "@medusajs/framework/utils"

const OrderGroup = model.define("order_group", {
  id: model.id({ prefix: 'og' }).primaryKey(),
  display_id: model.autoincrement(),
  seller_count: model.number().computed(),
  customer_id: model.text().nullable(),
  total: model.bigNumber().computed(),
  // Unique: the second of two genuinely concurrent completions for the same
  // cart must fail this INSERT with a real DB constraint violation, not race
  // past an application-level "does a group already exist" read that can
  // return stale (pre-commit) state. See createOrderGroupStep for the
  // graceful recovery this backs.
  cart_id: model.text().unique(),
})

export default OrderGroup
