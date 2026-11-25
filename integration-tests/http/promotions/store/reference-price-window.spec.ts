import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
    ICacheService,
    IPromotionModuleService,
    IRegionModuleService,
    ISalesChannelModuleService,
    MedusaContainer,
    SalesChannelDTO,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { ProductDTO } from "@mercurjs/types"
import { createSellerUser } from "../../../helpers/create-seller-user"
import { createShippingProfile } from "../../../helpers/create-shipping-profile"
import {
    generatePublishableKey,
    generateStoreHeaders,
} from "../../../helpers/create-admin-user"
import { createVendorProduct } from "../../../helpers/create-product"
import { PROMOTION_CACHE_KEYS } from "@acme/api/src/lib/search/promotion-index"
import { approveSeller } from "../../../helpers/split-order-checkout"

jest.setTimeout(180000)

type RequestHeaders = { headers: Record<string, string> }

type ReferencePriceEntry = { amount: number; has_full_history: boolean }

type SnapshotInput = {
    variant_id: string
    seller_id: string
    currency_code: string
    amount: number
    captured_date: string
}

type PriceHistoryService = {
    createVariantPriceSnapshots: (data: SnapshotInput[]) => Promise<{ id: string }[]>
}

const VARIANT_PRICE_HISTORY_MODULE = "variantPriceHistory"
const DAY_MS = 24 * 60 * 60 * 1000
const PRE_CAMPAIGN_PRICE = 2000
const RAISED_PRICE = 3000
const CAMPAIGN_STARTED_DAYS_AGO = 20
const PRICE_RAISED_DAYS_AGO = 12
const HISTORY_DAYS = 30

const istanbulDate = (daysAgo: number): string =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(Date.now() - daysAgo * DAY_MS))

medusaIntegrationTestRunner({
    testSuite: ({ getContainer, api }) => {
        describe("Store - reference price window starts before the discount", () => {
            let appContainer: MedusaContainer
            let storeHeaders: RequestHeaders
            let salesChannel: SalesChannelDTO
            let product: ProductDTO

            const getReferencePrice = async (): Promise<ReferencePriceEntry | undefined> => {
                const cache = appContainer.resolve<ICacheService>(Modules.CACHE)
                await Promise.all(PROMOTION_CACHE_KEYS.map((key) => cache.invalidate(key)))
                const response = await api.get(
                    `/store/products/${product.id}/promotions?country_code=us`,
                    storeHeaders
                )
                const entries: Record<string, ReferencePriceEntry> = response.data.reference_prices
                return entries[product.variants[0].id]
            }

            const startCampaignPromotion = async (): Promise<void> => {
                const promotionService = appContainer.resolve<IPromotionModuleService>(Modules.PROMOTION)
                const campaign = await promotionService.createCampaigns({
                    name: "Reference Window Campaign",
                    campaign_identifier: `REFWIN-${Date.now()}`,
                    starts_at: new Date(Date.now() - CAMPAIGN_STARTED_DAYS_AGO * DAY_MS),
                    ends_at: new Date(Date.now() + DAY_MS),
                })
                await promotionService.createPromotions({
                    code: "REFWIN10",
                    type: "standard",
                    status: "active",
                    is_automatic: true,
                    campaign_id: campaign.id,
                    application_method: {
                        type: "percentage",
                        target_type: "items",
                        allocation: "each",
                        value: 10,
                        max_quantity: 1,
                        target_rules: [
                            { attribute: "items.product.id", operator: "in", values: [product.id] },
                        ],
                    },
                })
            }

            beforeAll(async () => {
                appContainer = getContainer()
            })

            beforeEach(async () => {
                const apiKey = await generatePublishableKey(appContainer)
                storeHeaders = generateStoreHeaders({ publishableKey: apiKey })

                salesChannel = await appContainer
                    .resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)
                    .createSalesChannels({ name: "Reference Window Store" })
                await appContainer
                    .resolve<IRegionModuleService>(Modules.REGION)
                    .createRegions({ name: "Reference Window Region", currency_code: "usd", countries: ["us"] })

                const sellerResult = await createSellerUser(appContainer, {
                    email: "refwin-seller@test.com",
                    name: "Reference Window Seller",
                })
                await approveSeller(appContainer, sellerResult.seller.id)
                const headers = sellerResult.headers
                const stockLocation = (
                    await api.post(`/vendor/stock-locations`, { name: "Reference Window Warehouse" }, headers)
                ).data.stock_location
                await api.post(
                    `/vendor/stock-locations/${stockLocation.id}/sales-channels`,
                    { add: [salesChannel.id] },
                    headers
                )
                const shippingProfile = await createShippingProfile(appContainer, { name: "Reference Window SP" })
                product = await createVendorProduct(api, headers, {
                    title: "Reference Window Product",
                    variants: [
                        {
                            title: "Default",
                            sku: `REFWIN-${Date.now()}`,
                            prices: [{ amount: RAISED_PRICE, currency_code: "usd" }],
                            inventory: [{ location_id: stockLocation.id, quantity: 100 }],
                        },
                    ],
                    extra: { shipping_profile_id: shippingProfile.id },
                })

                const snapshots: SnapshotInput[] = []
                for (let daysAgo = HISTORY_DAYS; daysAgo >= 1; daysAgo--) {
                    snapshots.push({
                        variant_id: product.variants[0].id,
                        seller_id: sellerResult.seller.id,
                        currency_code: "usd",
                        amount: daysAgo > PRICE_RAISED_DAYS_AGO ? PRE_CAMPAIGN_PRICE : RAISED_PRICE,
                        captured_date: istanbulDate(daysAgo),
                    })
                }
                await appContainer
                    .resolve<PriceHistoryService>(VARIANT_PRICE_HISTORY_MODULE)
                    .createVariantPriceSnapshots(snapshots)
            })

            it("uses the trailing 10 days when the product has no discount", async () => {
                expect(await getReferencePrice()).toEqual({ amount: RAISED_PRICE, has_full_history: true })
            })

            it("keeps the pre-campaign floor after a price raise in the middle of a long campaign", async () => {
                await startCampaignPromotion()

                expect(await getReferencePrice()).toEqual({
                    amount: PRE_CAMPAIGN_PRICE,
                    has_full_history: true,
                })
            })
        })
    },
})
