import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
    ICacheService,
    IPromotionModuleService,
    IRegionModuleService,
    ISalesChannelModuleService,
    MedusaContainer,
    SalesChannelDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { MercurModules, ProductDTO } from "@mercurjs/types"
import { PROMOTION_CACHE_KEYS } from "@acme/api/src/lib/search/promotion-index"
import type { CampaignBadge } from "@acme/api/src/lib/search/campaign-badges"
import { createSellerUser } from "../../../helpers/create-seller-user"
import { createShippingProfile } from "../../../helpers/create-shipping-profile"
import {
    generatePublishableKey,
    generateStoreHeaders,
} from "../../../helpers/create-admin-user"
import { createVendorProduct } from "../../../helpers/create-product"
import { approveSeller } from "../../../helpers/split-order-checkout"

jest.setTimeout(180000)

type RequestHeaders = { headers: Record<string, string> }
type ProductPromotion = { id: string; campaign_badges: CampaignBadge[] }
type PromotionInput = Parameters<IPromotionModuleService["createPromotions"]>[0]

const DAY_MS = 24 * 60 * 60 * 1000

medusaIntegrationTestRunner({
    testSuite: ({ getContainer, api }) => {
        describe("Store - product campaign labels", () => {
            let appContainer: MedusaContainer
            let storeHeaders: RequestHeaders
            let salesChannel: SalesChannelDTO
            let product: ProductDTO
            let sellerId: string

            const createSellerProduct = async (email: string): Promise<{ product: ProductDTO; sellerId: string }> => {
                const sellerResult = await createSellerUser(appContainer, { email, name: email })
                await approveSeller(appContainer, sellerResult.seller.id)
                const headers = sellerResult.headers
                const stockLocation = (
                    await api.post(`/vendor/stock-locations`, { name: `${email} WH` }, headers)
                ).data.stock_location
                await api.post(
                    `/vendor/stock-locations/${stockLocation.id}/sales-channels`,
                    { add: [salesChannel.id] },
                    headers
                )
                const shippingProfile = await createShippingProfile(
                    appContainer,
                    { name: `${email} SP` },
                    { seller_id: sellerResult.seller.id }
                )
                const created = await createVendorProduct(api, headers, {
                    title: `${email} product`,
                    variants: [
                        {
                            title: "Default",
                            sku: `BADGE-${email}-${Date.now()}`,
                            prices: [{ amount: 2000, currency_code: "usd" }],
                            inventory: [{ location_id: stockLocation.id, quantity: 100 }],
                        },
                    ],
                    extra: { shipping_profile_id: shippingProfile.id },
                })
                return { product: created, sellerId: sellerResult.seller.id }
            }

            const createPromotion = async (input: PromotionInput): Promise<string> => {
                const promotion = await appContainer
                    .resolve<IPromotionModuleService>(Modules.PROMOTION)
                    .createPromotions(input)
                return promotion.id
            }

            const linkToSeller = async (promotionId: string, ownerId: string): Promise<void> => {
                await appContainer.resolve(ContainerRegistrationKeys.LINK).create({
                    [Modules.PROMOTION]: { promotion_id: promotionId },
                    [MercurModules.SELLER]: { seller_id: ownerId },
                })
            }

            const orderPromotion = (code: string, value: number, overrides: Partial<PromotionInput> = {}): PromotionInput => ({
                code,
                type: "standard",
                status: "active",
                is_automatic: true,
                application_method: { type: "percentage", target_type: "order", allocation: "across", value },
                ...overrides,
            })

            const getBadges = async (): Promise<CampaignBadge[]> => {
                const cache = appContainer.resolve<ICacheService>(Modules.CACHE)
                await Promise.all(PROMOTION_CACHE_KEYS.map((key) => cache.invalidate(key)))
                const response = await api.get(
                    `/store/products/${product.id}/promotions?country_code=us`,
                    storeHeaders
                )
                const promotions: ProductPromotion[] = response.data.promotions
                return promotions[0]?.campaign_badges ?? []
            }

            beforeAll(async () => {
                appContainer = getContainer()
            })

            beforeEach(async () => {
                const apiKey = await generatePublishableKey(appContainer)
                storeHeaders = generateStoreHeaders({ publishableKey: apiKey })
                salesChannel = await appContainer
                    .resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)
                    .createSalesChannels({ name: "Badge Store" })
                await appContainer
                    .resolve<IRegionModuleService>(Modules.REGION)
                    .createRegions({ name: "Badge Region", currency_code: "usd", countries: ["us"] })
                const seeded = await createSellerProduct("badge-seller@test.com")
                product = seeded.product
                sellerId = seeded.sellerId
            })

            it("labels every kind of running promotion covering the product", async () => {
                await createPromotion({
                    code: "BADGECODE",
                    type: "standard",
                    status: "active",
                    is_automatic: false,
                    application_method: {
                        type: "percentage",
                        target_type: "items",
                        allocation: "each",
                        value: 10,
                        max_quantity: 1,
                        target_rules: [{ attribute: "items.product.id", operator: "in", values: [product.id] }],
                    },
                })
                await createPromotion({
                    code: "BADGEBUYGET",
                    type: "buyget",
                    status: "active",
                    is_automatic: true,
                    application_method: {
                        type: "percentage",
                        target_type: "items",
                        allocation: "each",
                        value: 100,
                        max_quantity: 1,
                        apply_to_quantity: 1,
                        buy_rules_min_quantity: 2,
                        buy_rules: [{ attribute: "items.product.id", operator: "in", values: [product.id] }],
                        target_rules: [{ attribute: "items.product.id", operator: "in", values: [product.id] }],
                    },
                })
                await linkToSeller(await createPromotion(orderPromotion("BADGEORDER", 10)), sellerId)
                await createPromotion({
                    code: "BADGESHIP",
                    type: "standard",
                    status: "active",
                    is_automatic: true,
                    application_method: {
                        type: "percentage",
                        target_type: "shipping_methods",
                        allocation: "across",
                        value: 100,
                    },
                })

                expect(await getBadges()).toEqual([
                    { type: "free_shipping" },
                    { type: "buy_get", buy: 3, pay: 2 },
                    { type: "order_discount", discount_type: "percentage", value: 10, currency_code: null },
                    { type: "code" },
                ])
            })

            it("gives no label for draft, ended or not-yet-started promotions", async () => {
                const promotionModule = appContainer.resolve<IPromotionModuleService>(Modules.PROMOTION)
                const ended = await promotionModule.createCampaigns({
                    name: "Ended",
                    campaign_identifier: `ENDED-${Date.now()}`,
                    starts_at: new Date(Date.now() - 2 * DAY_MS),
                    ends_at: new Date(Date.now() - DAY_MS),
                })
                const upcoming = await promotionModule.createCampaigns({
                    name: "Upcoming",
                    campaign_identifier: `UPCOMING-${Date.now()}`,
                    starts_at: new Date(Date.now() + DAY_MS),
                    ends_at: new Date(Date.now() + 2 * DAY_MS),
                })
                await createPromotion(orderPromotion("BADGEDRAFT", 10, { status: "draft" }))
                await createPromotion(orderPromotion("BADGEENDED", 10, { campaign_id: ended.id }))
                await createPromotion(orderPromotion("BADGEUPCOMING", 10, { campaign_id: upcoming.id }))

                expect(await getBadges()).toEqual([])
            })

            it("labels a platform order promotion but not another seller's", async () => {
                const other = await createSellerProduct("badge-other@test.com")
                await linkToSeller(await createPromotion(orderPromotion("BADGEOTHER", 20)), other.sellerId)
                expect(await getBadges()).toEqual([])

                await createPromotion(orderPromotion("BADGEPLATFORM", 5))
                expect(await getBadges()).toEqual([
                    { type: "order_discount", discount_type: "percentage", value: 5, currency_code: null },
                ])
            })
        })
    },
})
