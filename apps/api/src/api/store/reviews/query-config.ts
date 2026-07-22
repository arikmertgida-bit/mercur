export const storeReviewFields = [
  'id',
  'reference',
  'reference_id',
  'rating',
  'customer_note',
  'customer.first_name',
  'customer.last_name',
  'seller_note',
  'created_at',
  'updated_at'
]

export const storeReviewQueryConfig = {
  list: {
    defaults: storeReviewFields,
    isList: true
  },
  retrieve: {
    defaults: storeReviewFields,
    isList: false
  }
}
