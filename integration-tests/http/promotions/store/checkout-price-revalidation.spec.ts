import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
    IPricingModuleService,
    IPromotionModuleService,
    IRegionModuleService,
    ISalesChannelModuleService,
    MedusaContainer,
    RegionDTO,
    SalesChannelDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
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

type CartAdjustment = { code?: string | null; amount: number }

type StoreCart = {
    id: string
    total: number
    items: { id: string; unit_price: number; adjustments?: CartAdjustment[] | null }[]
    payment_collection?: { id: string; amount: number } | null
}

const PROMO_CODE = "CAMPAIGN10"
const DAY_MS = 24 * 60 * 60 * 1000

medusaIntegrationTestRunner({
    testSuite: ({ getContainer, api }) => {
        describe("Store - cart completion re-validates prices and promotions", () => {
            let appContainer: MedusaContainer
            let storeHeaders: RequestHeaders
            let region: RegionDTO
            let salesChannel: SalesChannelDTO
            let product: ProductDTO
            let campaignId: string
            let counter = 0

            const createShippingPrerequisites = async (headers: RequestHeaders) => {
                const suffix = `_${Date.now()}_${++counter}`
                const stockLocation = (
                    await api.post(`/vendor/stock-locations`, { name: `Warehouse${suffix}` }, headers)
                ).data.stock_location
                await api.post(
                    `/vendor/stock-locations/${stockLocation.id}/fulfillment-sets`,
                    { name: `FS${suffix}`, type: "shipping" },
                    headers
                )
                const fulfillmentSet = (
                    await api.get(
                        `/vendor/stock-locations/${stockLocation.id}?fields=*fulfillment_sets`,
                        headers
                    )
                ).data.stock_location.fulfillment_sets[0]
                const serviceZone = (
                    await api.post(
                        `/vendor/fulfillment-sets/${fulfillmentSet.id}/service-zones`,
                        { name: `SZ${suffix}`, geo_zones: [{ type: "country", country_code: "us" }] },
                        headers
                    )
                ).data.fulfillment_set.service_zones.find(
                    (zone: { name: string }) => zone.name === `SZ${suffix}`
                )
                const shippingProfile = await createShippingProfile(appContainer, {
                    name: `SP${suffix}`,
                })
                await api.post(
                    `/vendor/stock-locations/${stockLocation.id}/fulfillment-providers`,
                    { add: ["manual_manual"] },
                    headers
                )
                await api.post(
                    `/vendor/stock-locations/${stockLocation.id}/sales-channels`,
                    { add: [salesChannel.id] },
                    headers
                )
                return { stockLocation, serviceZone, shippingProfile }
            }

            /** Address, shipping and a payment session — the cart is ready to be paid. */
            const prepareCartForPayment = async (
                options: { variantIds?: string[]; promoCodes?: string[] } = {}
            ): Promise<StoreCart> => {
                const cart = (
                    await api.post(
                        `/store/carts`,
                        { region_id: region.id, sales_channel_id: salesChannel.id, currency_code: "usd" },
                        storeHeaders
                    )
                ).data.cart
                for (const variantId of options.variantIds ?? [product.variants[0].id]) {
                    await api.post(
                        `/store/carts/${cart.id}/line-items`,
                        { variant_id: variantId, quantity: 1 },
                        storeHeaders
                    )
                }
                const promoCodes = options.promoCodes ?? [PROMO_CODE]
                if (promoCodes.length) {
                    await api.post(
                        `/store/carts/${cart.id}/promotions`,
                        { promo_codes: promoCodes },
                        storeHeaders
                    )
                }
                const address = {
                    first_name: "Buyer",
                    last_name: "Test",
                    address_1: "123 Main St",
                    city: "New York",
                    country_code: "us",
                    postal_code: "10001",
                }
                await api.post(
                    `/store/carts/${cart.id}`,
                    { email: "revalidation-customer@test.com", shipping_address: address, billing_address: address },
                    storeHeaders
                )
                const shippingOptions = (
                    await api.get(`/store/shipping-options?cart_id=${cart.id}`, storeHeaders)
                ).data.shipping_options as Record<string, { id: string }[]>
                for (const options of Object.values(shippingOptions)) {
                    if (options.length > 0) {
                        await api.post(
                            `/store/carts/${cart.id}/shipping-methods`,
                            { option_id: options[0].id },
                            storeHeaders
                        )
                    }
                }
                await createPaymentSession(cart.id)
                return getCart(cart.id)
            }

            const createPaymentSession = async (cartId: string): Promise<void> => {
                const paymentCollection = (
                    await api.post(`/store/payment-collections`, { cart_id: cartId }, storeHeaders)
                ).data.payment_collection
                await api.post(
                    `/store/payment-collections/${paymentCollection.id}/payment-sessions`,
                    { provider_id: "pp_system_default" },
                    storeHeaders
                )
            }

            const getCart = async (cartId: string): Promise<StoreCart> =>
                (
                    await api.get(
                        `/store/carts/${cartId}?fields=+items.adjustments.*,+payment_collection.amount`,
                        storeHeaders
                    )
                ).data.cart

            const completeCart = (cartId: string, language?: string) =>
                api
                    .post(
                        `/store/carts/${cartId}/complete`,
                        {},
                        language
                            ? { headers: { ...storeHeaders.headers, "accept-language": language } }
                            : storeHeaders
                    )
                    .catch(
                        (error: {
                            response: { status: number; data: { code?: string; type?: string; message?: string } }
                        }) => error.response
                    )

            const discountOf = (cart: StoreCart): number =>
                cart.items.flatMap((item) => item.adjustments ?? []).reduce((sum, adj) => sum + adj.amount, 0)

            const expectRejectedThenRetried = async (
                cart: StoreCart,
                assertRefreshed: (refreshed: StoreCart) => void
            ) => {
                const rejected = await completeCart(cart.id, "tr")
                expect(rejected.status).toEqual(400)
                expect(rejected.data.code).toEqual("cart_prices_changed")
                expect(rejected.data.message).toEqual(
                    "Sepetinizdeki fiyatlar güncellendi. Lütfen sepetinizi kontrol edin."
                )

                const { data: orderCarts } = await appContainer
                    .resolve(ContainerRegistrationKeys.QUERY)
                    .graph({ entity: "order_group", fields: ["id"], filters: { cart_id: cart.id } })
                expect(orderCarts).toHaveLength(0)

                const refreshed = await getCart(cart.id)
                assertRefreshed(refreshed)
                expect(refreshed.payment_collection?.amount).toEqual(refreshed.total)

                await createPaymentSession(cart.id)
                const completed = await completeCart(cart.id)
                expect(completed.status).toEqual(200)
                expect(completed.data.type).toEqual("order_group")
            }

            beforeAll(async () => {
                appContainer = getContainer()
            })

            const createSellerWithProduct = async (
                email: string,
                name: string
            ): Promise<{ headers: RequestHeaders; product: ProductDTO }> => {
                const sellerResult = await createSellerUser(appContainer, { email, name })
                await approveSeller(appContainer, sellerResult.seller.id)
                const sellerHeaders = sellerResult.headers

                const prerequisites = await createShippingPrerequisites(sellerHeaders)
                await api.post(
                    `/vendor/shipping-options`,
                    {
                        name: `${name} Shipping`,
                        service_zone_id: prerequisites.serviceZone.id,
                        shipping_profile_id: prerequisites.shippingProfile.id,
                        provider_id: "manual_manual",
                        price_type: "flat",
                        type: { label: "Standard", description: "Standard", code: "standard" },
                        prices: [{ currency_code: "usd", amount: 500 }],
                        rules: [{ attribute: "enabled_in_store", value: "true", operator: "eq" }],
                    },
                    sellerHeaders
                )
                const created = await createVendorProduct(api, sellerHeaders, {
                    title: `${name} Product`,
                    variants: [
                        {
                            title: "Default",
                            sku: `REVAL-${Date.now()}-${++counter}`,
                            prices: [{ amount: 2000, currency_code: "usd" }],
                            inventory: [{ location_id: prerequisites.stockLocation.id, quantity: 100 }],
                        },
                    ],
                    extra: { shipping_profile_id: prerequisites.shippingProfile.id },
                })
                await api.post(
                    `/vendor/sales-channels/${salesChannel.id}/products`,
                    { add: [created.id] },
                    sellerHeaders
                )
                return { headers: sellerHeaders, product: created }
            }

            beforeEach(async () => {
                const customerResult = await createCustomerUser(appContainer, {
                    email: "revalidation-customer@test.com",
                    first_name: "Revalidation",
                    last_name: "Customer",
                })
                const apiKey = await generatePublishableKey(appContainer)
                const publishable = generateStoreHeaders({ publishableKey: apiKey })
                storeHeaders = {
                    headers: { ...publishable.headers, ...customerResult.headers.headers },
                }

                salesChannel = await appContainer
                    .resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)
                    .createSalesChannels({ name: "Revalidation Store" })
                region = await appContainer
                    .resolve<IRegionModuleService>(Modules.REGION)
                    .createRegions({ name: "Revalidation Region", currency_code: "usd", countries: ["us"] })
                await appContainer.resolve(ContainerRegistrationKeys.LINK).create({
                    [Modules.REGION]: { region_id: region.id },
                    [Modules.PAYMENT]: { payment_provider_id: "pp_system_default" },
                })

                const seller = await createSellerWithProduct(
                    "revalidation-seller@test.com",
                    "Revalidation Seller"
                )
                product = seller.product

                const promotionModule = appContainer.resolve<IPromotionModuleService>(Modules.PROMOTION)
                const campaign = await promotionModule.createCampaigns({
                    name: "Revalidation Campaign",
                    campaign_identifier: `REVAL-${Date.now()}`,
                    starts_at: new Date(Date.now() - DAY_MS),
                    ends_at: new Date(Date.now() + DAY_MS),
                    budget: { type: "usage", limit: 1 },
                })
                campaignId = campaign.id
                await promotionModule.createPromotions({
                    code: PROMO_CODE,
                    type: "standard",
                    status: "active",
                    campaign_id: campaign.id,
                    application_method: {
                        type: "percentage",
                        target_type: "order",
                        allocation: "across",
                        value: 10,
                    },
                })
            })

            it("completes an unchanged cart with its discount", async () => {
                const cart = await prepareCartForPayment()
                expect(discountOf(cart)).toBeGreaterThan(0)

                const completed = await completeCart(cart.id)
                expect(completed.status).toEqual(200)
                expect(completed.data.type).toEqual("order_group")
            })

            it("rejects a cart whose campaign ended after the discount was applied", async () => {
                const cart = await prepareCartForPayment()
                expect(discountOf(cart)).toBeGreaterThan(0)

                await appContainer
                    .resolve<IPromotionModuleService>(Modules.PROMOTION)
                    .updateCampaigns({ id: campaignId, ends_at: new Date(Date.now() - 60 * 1000) })

                await expectRejectedThenRetried(cart, (refreshed) => {
                    expect(discountOf(refreshed)).toEqual(0)
                    expect(refreshed.total).toBeGreaterThan(cart.total)
                })
            })

            it("rejects a cart whose campaign budget ran out", async () => {
                const first = await prepareCartForPayment()
                const second = await prepareCartForPayment()
                expect(discountOf(second)).toBeGreaterThan(0)

                const completedFirst = await completeCart(first.id)
                expect(completedFirst.status).toEqual(200)

                await expectRejectedThenRetried(second, (refreshed) => {
                    expect(discountOf(refreshed)).toEqual(0)
                })
            })

            it("rejects a cart whose item price changed after it was added", async () => {
                const cart = await prepareCartForPayment()
                expect(cart.items[0].unit_price).toEqual(2000)

                const { data: variants } = await appContainer
                    .resolve(ContainerRegistrationKeys.QUERY)
                    .graph({
                        entity: "product_variant",
                        fields: ["price_set.id", "price_set.prices.id"],
                        filters: { id: product.variants[0].id },
                    })
                const priceSet = variants[0].price_set
                await appContainer
                    .resolve<IPricingModuleService>(Modules.PRICING)
                    .updatePriceSets(priceSet.id, {
                        prices: [{ id: priceSet.prices[0].id, amount: 2600, currency_code: "usd" }],
                    })

                await expectRejectedThenRetried(cart, (refreshed) => {
                    expect(refreshed.items[0].unit_price).toEqual(2600)
                })
            })

            it("completes a multi-seller cart holding one seller's automatic promotion", async () => {
                const other = await createSellerWithProduct(
                    "revalidation-seller-b@test.com",
                    "Revalidation Seller B"
                )
                const created = await api.post(
                        `/vendor/promotions`,
                        {
                            type: "standard",
                            status: "active",
                            is_automatic: true,
                            application_method: {
                                type: "percentage",
                                target_type: "items",
                                allocation: "each",
                                value: 10,
                                max_quantity: 5,
                                target_rules: [
                                    {
                                        attribute: "items.product.id",
                                        operator: "in",
                                        values: [other.product.id],
                                    },
                                ],
                            },
                        },
                        other.headers
                    )
                expect(created.data.promotion.is_automatic).toBe(true)

                const cart = await prepareCartForPayment({
                    variantIds: [product.variants[0].id, other.product.variants[0].id],
                    promoCodes: [],
                })
                const discounted = cart.items.filter((item) => (item.adjustments ?? []).length > 0)
                expect(discounted).toHaveLength(1)

                const completed = await completeCart(cart.id)
                expect(completed.status).toEqual(200)
                expect(completed.data.type).toEqual("order_group")
            })

            it("leaves an already completed cart's retry untouched", async () => {
                const cart = await prepareCartForPayment()
                const completed = await completeCart(cart.id)
                expect(completed.status).toEqual(200)

                await appContainer
                    .resolve<IPromotionModuleService>(Modules.PROMOTION)
                    .updateCampaigns({ id: campaignId, ends_at: new Date(Date.now() - 60 * 1000) })

                const retried = await completeCart(cart.id)
                expect(retried.status).toEqual(200)
                expect(retried.data.order_group.id).toEqual(completed.data.order_group.id)
            })
        })
    },
})

