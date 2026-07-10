export const adminWishlistFields = [
  "id",
  "reference",
  "created_at",
  "updated_at",
  "customer.id",
  "customer.first_name",
  "customer.last_name",
  "customer.email",
  "products.id",
  "products.title",
]

export const adminWishlistQueryConfig = {
  list: {
    defaults: adminWishlistFields,
    defaultLimit: 20,
    isList: true,
  },
}
