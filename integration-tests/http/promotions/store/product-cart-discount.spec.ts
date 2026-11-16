import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
    ICacheService,
    IProductModuleService,
    IPromotionModuleService,
    IRegionModuleService,
    ISalesChannelModuleService,
    MedusaContainer,
    RegionDTO,
    SalesChannelDTO,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { ProductDTO } from "@mercurjs/types"
import { createSellerUser } from "../../../helpers/create-seller-user"
import { createShippingProfile } from "../../../helpers/create-shipping-profile"
import { createCustomerUser } from "../../../helpers/create-customer-user"
import {
    generatePublishableKey,
    generateStoreHeaders,
} from "../../../helpers/create-admin-user"
import { createVendorProduct } from "../../../helpers/create-product"
import { approveSeller } from "../../../helpers/split-order-checkout"

jest.setTimeout(180000)

type RequestHeaders = { headers: Record<string, string> }

type CartDiscountStep = { type: "percentage" | "fixed"; value: number; budget_remaining: number | null }

type ProductPromotion = {
    id: string
    cart_discount: { currency_code: string | null; steps: CartDiscountStep[] } | null
}

type StoreCart = {
    id: string
    items: { unit_price: number; adjustments?: { amount: number }[] | null }[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const UNIT_PRICE = 2000
const PROMOTION_CACHE_KEYS = ["search:product-promotions:active", "search:product-promotions:upcoming"]

medusaIntegrationTestRunner({
    testSuite: ({ getContainer, api }) => {
        describe("Store - product cart discount label matches the cart", () => {
            let appContainer: MedusaContainer
            let storeHeaders: RequestHeaders
            let region: RegionDTO
            let salesChannel: SalesChannelDTO
            let product: ProductDTO
            let campaignId: string

            const createProduct = async (): Promise<ProductDTO> => {
                const sellerResult = await createSellerUser(appContainer, {
                    email: "label-seller@test.com",
                    name: "Label Seller",
                })
                await approveSeller(appContainer, sellerResult.seller.id)
                const headers = sellerResult.headers
                const stockLocation = (
                    await api.post(`/vendor/stock-locations`, { name: "Label Warehouse" }, headers)
                ).data.stock_location
                await api.post(
                    `/vendor/stock-locations/${stockLocation.id}/sales-channels`,
                    { add: [salesChannel.id] },
                    headers
                )
                const shippingProfile = await createShippingProfile(appContainer, { name: "Label SP" })
                const created = await createVendorProduct(api, headers, {
                    title: "Label Product",
                    variants: [
                        {
                            title: "Default",
                            sku: `LABEL-${Date.now()}`,
                            prices: [{ amount: UNIT_PRICE, currency_code: "usd" }],
                            inventory: [{ location_id: stockLocation.id, quantity: 100 }],
                        },
                    ],
                    extra: { shipping_profile_id: shippingProfile.id },
                })
                await api.post(
                    `/vendor/sales-channels/${salesChannel.id}/products`,
                    { add: [created.id] },
                    headers
                )
                return created
            }

            const createItemPromotion = async (
                code: string,
                value: number,
                isAutomatic: boolean
            ): Promise<void> => {
                await appContainer.resolve<IPromotionModuleService>(Modules.PROMOTION).createPromotions({
                    code,
                    type: "standard",
                    status: "active",
                    is_automatic: isAutomatic,
                    campaign_id: campaignId,
                    application_method: {
                        type: "percentage",
                        target_type: "items",
                        allocation: "each",
                        value,
                        max_quantity: 1,
                        target_rules: [
                            { attribute: "items.product.id", operator: "in", values: [product.id] },
                        ],
                    },
                })
            }

            // The product's own creation already ran the search reindex, which
            // caches the (still empty) promotion list for a minute.
            const clearPromotionCache = async (): Promise<void> => {
                const cache = appContainer.resolve<ICacheService>(Modules.CACHE)
                await Promise.all(PROMOTION_CACHE_KEYS.map((key) => cache.invalidate(key)))
            }

            const getLeadPromotion = async (countryCode = "us"): Promise<ProductPromotion | undefined> => {
                await clearPromotionCache()
                const response = await api.get(
                    `/store/products/${product.id}/promotions?country_code=${countryCode}`,
                    storeHeaders
                )
                const promotions: ProductPromotion[] = response.data.promotions
                return promotions[0]
            }

            beforeAll(async () => {
                appContainer = getContainer()
            })

            beforeEach(async () => {
                const customerResult = await createCustomerUser(appContainer, {
                    email: "label-customer@test.com",
                    first_name: "Label",
                    last_name: "Customer",
                })
                const apiKey = await generatePublishableKey(appContainer)
                const publishable = generateStoreHeaders({ publishableKey: apiKey })
                storeHeaders = { headers: { ...publishable.headers, ...customerResult.headers.headers } }

                salesChannel = await appContainer
                    .resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)
                    .createSalesChannels({ name: "Label Store" })
                region = await appContainer
                    .resolve<IRegionModuleService>(Modules.REGION)
                    .createRegions({ name: "Label Region", currency_code: "usd", countries: ["us"] })

                product = await createProduct()

                const campaign = await appContainer
                    .resolve<IPromotionModuleService>(Modules.PROMOTION)
                    .createCampaigns({
                        name: "Label Campaign",
                        campaign_identifier: `LABEL-${Date.now()}`,
                        starts_at: new Date(Date.now() - DAY_MS),
                        ends_at: new Date(Date.now() + DAY_MS),
                    })
                campaignId = campaign.id
            })

            it("lists every automatic item promotion in the order the cart applies them", async () => {
                await createItemPromotion("LABEL10", 10, true)
                await createItemPromotion("LABEL15", 15, true)
                await createItemPromotion("LABELCODE50", 50, false)

                const lead = await getLeadPromotion()
                expect(lead?.cart_discount?.steps).toEqual([
                    { type: "percentage", value: 15, budget_remaining: null },
                    { type: "percentage", value: 10, budget_remaining: null },
                ])

                const cart = (
                    await api.post(
                        `/store/carts`,
                        { region_id: region.id, sales_channel_id: salesChannel.id, currency_code: "usd" },
                        storeHeaders
                    )
                ).data.cart
                await api.post(
                    `/store/carts/${cart.id}/line-items`,
                    { variant_id: product.variants[0].id, quantity: 1 },
                    storeHeaders
                )
                const refreshed: StoreCart = (
                    await api.get(`/store/carts/${cart.id}?fields=+items.adjustments.*`, storeHeaders)
                ).data.cart

                const cartDiscount = refreshed.items
                    .flatMap((item) => item.adjustments ?? [])
                    .reduce((sum, adjustment) => sum + adjustment.amount, 0)
                const labelDiscount = (lead?.cart_discount?.steps ?? []).reduce(
                    (remaining, step) => remaining - (remaining * step.value) / 100,
                    UNIT_PRICE
                )
                expect(cartDiscount).toBeCloseTo(UNIT_PRICE - labelDiscount, 6)
            })

            it("prices the cart discount in the currency of the requested country region", async () => {
                await createItemPromotion("LABELREGION", 10, true)
                await appContainer
                    .resolve<IRegionModuleService>(Modules.REGION)
                    .createRegions({ name: "Label EU Region", currency_code: "eur", countries: ["de"] })

                expect((await getLeadPromotion("us"))?.cart_discount?.currency_code).toBe("usd")
                expect((await getLeadPromotion("DE"))?.cart_discount?.currency_code).toBe("eur")
            })

            it("rejects a request without a country code", async () => {
                const response = await api
                    .get(`/store/products/${product.id}/promotions`, storeHeaders)
                    .catch((error: { response: { status: number } }) => error.response)
                expect(response.status).toBe(400)
            })

            it("gives no cart discount once the campaign has ended", async () => {
                await createItemPromotion("LABELEND", 20, true)
                expect((await getLeadPromotion())?.cart_discount?.steps).toHaveLength(1)

                await appContainer
                    .resolve<IPromotionModuleService>(Modules.PROMOTION)
                    .updateCampaigns({ id: campaignId, ends_at: new Date(Date.now() - 60 * 1000) })

                expect((await getLeadPromotion())?.cart_discount ?? null).toBeNull()
            })

            it("gives no cart discount for a product that is not discountable", async () => {
                await createItemPromotion("LABELNODISC", 20, true)
                await appContainer
                    .resolve<IProductModuleService>(Modules.PRODUCT)
                    .updateProducts(product.id, { discountable: false })

                expect((await getLeadPromotion())?.cart_discount ?? null).toBeNull()
            })
        })
    },
})
