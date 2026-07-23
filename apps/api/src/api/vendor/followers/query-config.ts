export const vendorFollowersFields = [
  "seller_follower.id",
  "seller_follower.created_at",
  "seller_follower.customer.id",
  "seller_follower.customer.email",
  "seller_follower.customer.first_name",
  "seller_follower.customer.last_name",
  "seller_follower.customer.metadata",
]

export const vendorFollowersQueryConfig = {
  list: {
    defaults: vendorFollowersFields,
    isList: true,
  },
}
