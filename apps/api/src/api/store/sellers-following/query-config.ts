export const storeFollowedSellersFields = [
  "seller_follower.id",
  "seller_follower.created_at",
  "seller_follower.seller.id",
  "seller_follower.seller.name",
  "seller_follower.seller.handle",
  "seller_follower.seller.logo",
  "seller_follower.seller.status",
]

export const storeFollowedSellersQueryConfig = {
  list: {
    defaults: storeFollowedSellersFields,
    isList: true,
  },
}
