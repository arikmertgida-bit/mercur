export const storeCampaignFields = [
  "id",
  "name",
  "description",
  "campaign_identifier",
  "starts_at",
  "ends_at",
  "budget.*",
  "seller.id",
  "seller.status",
  "seller.name",
  "seller.handle",
  "seller.logo",
]

export const storeCampaignsQueryConfig = {
  list: {
    defaults: ["id"],
    defaultLimit: 24,
    isList: true,
  },
  retrieve: {
    defaults: storeCampaignFields,
    isList: false,
  },
}
