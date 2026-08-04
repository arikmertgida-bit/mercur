export type CampaignComputedStatus = "expired" | "scheduled" | "active"

export type CampaignStatusInput = {
  starts_at?: string | Date | null
  ends_at?: string | Date | null
}

// Mirrors packages/admin/src/pages/campaigns/common/utils/campaign-status.ts
// — the reference status computation MercurJS uses for the same campaign
// entity. Shared by every store-facing campaign route so the list and
// detail views can never disagree on what counts as "active".
export function computeCampaignStatus(
  campaign: CampaignStatusInput
): CampaignComputedStatus {
  const now = new Date()

  if (campaign.ends_at && new Date(campaign.ends_at) < now) {
    return "expired"
  }

  if (campaign.starts_at && new Date(campaign.starts_at) > now) {
    return "scheduled"
  }

  return "active"
}
