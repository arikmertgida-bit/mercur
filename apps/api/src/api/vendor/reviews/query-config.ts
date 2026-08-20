export const vendorReviewFields = [
  "id",
  "reference",
  "rating",
  "customer_note",
  "customer_id",
  "seller_note",
  "created_at",
  "updated_at",
  "product.id",
  "product.title",
  "product.thumbnail",
  "customer.id",
  "customer.first_name",
  "customer.last_name",
];

export const vendorReviewQueryConfig = {
  list: {
    defaults: vendorReviewFields,
    isList: true,
  },
  retrieve: {
    defaults: vendorReviewFields,
    isList: false,
  },
};
