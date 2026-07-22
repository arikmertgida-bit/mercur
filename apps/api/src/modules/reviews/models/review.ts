import { model } from '@medusajs/framework/utils'

export const Review = model.define('review', {
  id: model.id({ prefix: 'rev' }).primaryKey(),
  reference: model.enum(['product', 'seller']),
  // Denormalized copy of the product/seller id this review is about. The
  // authoritative relation still lives in the product_review/seller_review
  // link tables (used for cross-module joins), but every reader that only
  // needs "which product/seller was this review about" — the store review
  // response, "my written reviews", moderation views — needs a plain column
  // instead of resolving a link on every read.
  reference_id: model.text().nullable(),
  rating: model.number(),
  customer_note: model.text().nullable(),
  seller_note: model.text().nullable()
})
