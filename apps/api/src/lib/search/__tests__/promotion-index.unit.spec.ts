import {
  IndexedProductPromotion,
  isInCampaignPhase,
  matchCampaignIds,
  pickCampaignWindow,
  PromotionMatchableProduct,
  promotionsInSellerScope,
} from "../promotion-index"

const NOW = Date.parse("2026-11-16T12:00:00.000Z")
const HOUR = 60 * 60 * 1000

function iso(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString()
}

const product: PromotionMatchableProduct = {
  id: "prod_1",
  category_ids: ["pcat_1"],
  collection_id: null,
  type_id: null,
  tag_ids: [],
}

function promotion(
  overrides: Partial<IndexedProductPromotion> & Pick<IndexedProductPromotion, "promotionId">
): IndexedProductPromotion {
  return {
    sellerId: "sel_1",
    campaignId: null,
    campaignStartsAt: null,
    campaignEndsAt: null,
    kind: "percentage_off_product",
    rules: [{ attribute: "product_id", values: ["prod_1"] }],
    ...overrides,
  }
}

describe("isInCampaignPhase", () => {
  it("treats a promotion without a campaign as active, never upcoming", () => {
    expect(isInCampaignPhase(null, "active", NOW)).toBe(true)
    expect(isInCampaignPhase(null, "upcoming", NOW)).toBe(false)
  })

  it("puts a campaign that has not started yet in the upcoming phase only", () => {
    const campaign = { starts_at: iso(2 * HOUR), ends_at: iso(48 * HOUR) }
    expect(isInCampaignPhase(campaign, "upcoming", NOW)).toBe(true)
    expect(isInCampaignPhase(campaign, "active", NOW)).toBe(false)
  })

  it("puts a running campaign in the active phase only", () => {
    const campaign = { starts_at: iso(-HOUR), ends_at: iso(HOUR) }
    expect(isInCampaignPhase(campaign, "active", NOW)).toBe(true)
    expect(isInCampaignPhase(campaign, "upcoming", NOW)).toBe(false)
  })

  it("drops an ended campaign from both phases", () => {
    const campaign = { starts_at: iso(-48 * HOUR), ends_at: iso(-HOUR) }
    expect(isInCampaignPhase(campaign, "active", NOW)).toBe(false)
    expect(isInCampaignPhase(campaign, "upcoming", NOW)).toBe(false)
  })

  it("accepts Date values as the graph query returns them", () => {
    const campaign = { starts_at: new Date(NOW + HOUR), ends_at: null }
    expect(isInCampaignPhase(campaign, "upcoming", NOW)).toBe(true)
  })
})

describe("matchCampaignIds", () => {
  it("returns each matching campaign once and skips non-matching or campaign-less promotions", () => {
    const ids = matchCampaignIds(product, [
      promotion({ promotionId: "promo_a", campaignId: "camp_1" }),
      promotion({ promotionId: "promo_b", campaignId: "camp_1" }),
      promotion({
        promotionId: "promo_c",
        campaignId: "camp_2",
        rules: [{ attribute: "product_id", values: ["prod_other"] }],
      }),
      promotion({ promotionId: "promo_d" }),
    ])
    expect(ids).toEqual(["camp_1"])
  })
})

describe("pickCampaignWindow", () => {
  it("counts an active product down to its soonest-ending campaign, open-ended last", () => {
    const window = pickCampaignWindow(
      product,
      [
        promotion({ promotionId: "p1", campaignId: "open", campaignEndsAt: null }),
        promotion({ promotionId: "p2", campaignId: "late", campaignEndsAt: iso(10 * HOUR) }),
        promotion({ promotionId: "p3", campaignId: "soon", campaignEndsAt: iso(2 * HOUR) }),
      ],
      "active"
    )
    expect(window?.campaign_id).toBe("soon")
  })

  it("counts an upcoming product down to its soonest-starting campaign", () => {
    const window = pickCampaignWindow(
      product,
      [
        promotion({ promotionId: "p1", campaignId: "later", campaignStartsAt: iso(30 * HOUR) }),
        promotion({
          promotionId: "p2",
          campaignId: "next",
          campaignStartsAt: iso(3 * HOUR),
          campaignEndsAt: iso(27 * HOUR),
        }),
      ],
      "upcoming"
    )
    expect(window).toEqual({ campaign_id: "next", starts_at: iso(3 * HOUR), ends_at: iso(27 * HOUR) })
  })

  it("returns null when no campaign covers the product", () => {
    expect(
      pickCampaignWindow(product, [promotion({ promotionId: "p1" })], "active")
    ).toBeNull()
  })
})

describe("promotionsInSellerScope", () => {
  const own = promotion({ promotionId: "own", sellerId: "sel_1" })
  const other = promotion({ promotionId: "other", sellerId: "sel_2" })
  const platform = promotion({ promotionId: "platform", sellerId: null })

  it("keeps platform promotions and the seller's own, drops other sellers'", () => {
    expect(
      promotionsInSellerScope([own, other, platform], "sel_1").map((p) => p.promotionId)
    ).toEqual(["own", "platform"])
  })

  it("leaves only platform promotions for a product without a seller", () => {
    expect(
      promotionsInSellerScope([own, other, platform], undefined).map((p) => p.promotionId)
    ).toEqual(["platform"])
  })
})
