import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
    IRegionModuleService,
    ISalesChannelModuleService,
    MedusaContainer,
    RegionDTO,
    SalesChannelDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
    MercurModules,
    ProductDTO,
    ProductVariantDTO,
    SellerDTO,
    SellerStatus,
} from "@mercurjs/types"
import { createSellerUser } from "../../../helpers/create-seller-user"
import { createVendorProduct } from "../../../helpers/create-product"
import { createCustomerUser } from "../../../helpers/create-customer-user"
import {
    adminHeaders,
    createAdminUser,
    generatePublishableKey,
    generateStoreHeaders,
} from "../../../helpers/create-admin-user"

jest.setTimeout(120000)

/**
 * The `offer` entity (and the `metadata.offer_id` resolution path on
 * the admin "add items to order" routes) has been removed from the
 * backend. There is no more `resolveOfferItems` helper and no offer↔
 * line-item link — items are added directly via `variant_id`.
 *
 * Scope of this spec:
 *   - Admin can add an item to an order edit via an explicit
 *     `variant_id` + `unit_price`, exercising the base Medusa
 *     add-items route.
 */

type RequestHeaders = { headers: Record<string, string> }

type SellerModuleLike = {
    updateSellers: (
        input: { id: string; status: SellerStatus }[]
    ) => Promise<SellerDTO[]>
}

type SellerSeed = {
    sellerId: string
    headers: RequestHeaders
    product: ProductDTO
    variant: ProductVariantDTO
}

const approveSeller = async (
    container: MedusaContainer,
    sellerId: string
): Promise<void> => {
    const sellerModule = container.resolve<SellerModuleLike>(MercurModules.SELLER)
    await sellerModule.updateSellers([{
        id: sellerId,
        status: SellerStatus.OPEN,
    }])
}

medusaIntegrationTestRunner({
    testSuite: ({ getContainer, api, dbConnection }) => {
        describe("Admin - Offer ID resolution on add-items routes", () => {
            let appContainer: MedusaContainer
            let seller1Seed: SellerSeed
            let storeHeaders: RequestHeaders
            let region: RegionDTO
            let salesChannel: SalesChannelDTO
            let prerequisiteCounter = 0

            const seedSellerOfferWithShipping = async (opts: {
                email: string
                name: string
                stocked: number
                offerPrice: number
                currency_code?: string
            }): Promise<SellerSeed> => {
                const result = await createSellerUser(appContainer, {
                    email: opts.email,
                    name: opts.name,
                })
                await approveSeller(appContainer, result.seller.id)
                const headers = result.headers
                const tag = `_${opts.name}_${Date.now()}_${++prerequisiteCounter}`

                const stockLocation = (
                    await api.post(
                        `/vendor/stock-locations`,
                        { name: `Warehouse${tag}` },
                        headers
                    )
                ).data.stock_location

                await api.post(
                    `/vendor/stock-locations/${stockLocation.id}/fulfillment-sets`,
                    { name: `FS${tag}`, type: "shipping" },
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
                        {
                            name: `SZ${tag}`,
                            geo_zones: [{ type: "country", country_code: "us" }],
                        },
                        headers
                    )
                ).data.fulfillment_set.service_zones.find(
                    (zone: { name: string }) => zone.name === `SZ${tag}`
                )
                const shippingProfile = (
                    await api.post(
                        `/vendor/shipping-profiles`,
                        { name: `SP${tag}`, type: "default" },
                        headers
                    )
                ).data.shipping_profile

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
                await api.post(
                    `/vendor/shipping-options`,
                    {
                        name: `Ship${tag}`,
                        service_zone_id: serviceZone.id,
                        shipping_profile_id: shippingProfile.id,
                        provider_id: "manual_manual",
                        price_type: "flat",
                        type: {
                            label: "Standard",
                            description: "Standard",
                            code: "standard",
                        },
                        prices: [{ currency_code: "usd", amount: 500 }],
                        rules: [
                            {
                                attribute: "enabled_in_store",
                                value: "true",
                                operator: "eq",
                            },
                        ],
                    },
                    headers
                )

                const product = await createVendorProduct(api, headers, {
                    title: `Prod${tag}`,
                    variants: [
                        {
                            title: "Default",
                            sku: `V${tag}`,
                            prices: [
                                {
                                    amount: opts.offerPrice,
                                    currency_code:
                                        opts.currency_code ?? "usd",
                                },
                            ],
                            inventory: [
                                {
                                    location_id: stockLocation.id,
                                    quantity: opts.stocked,
                                },
                            ],
                        },
                    ],
                    extra: { shipping_profile_id: shippingProfile.id },
                })

                await api.post(
                    `/vendor/sales-channels/${salesChannel.id}/products`,
                    { add: [product.id] },
                    headers
                )

                return {
                    sellerId: result.seller.id,
                    headers,
                    product,
                    variant: product.variants[0],
                }
            }

            const completeCartCheckout = async (variantId: string) => {
                const cart = (
                    await api.post(
                        `/store/carts`,
                        {
                            region_id: region.id,
                            sales_channel_id: salesChannel.id,
                            currency_code: "usd",
                        },
                        storeHeaders
                    )
                ).data.cart

                await api.post(
                    `/store/carts/${cart.id}/line-items`,
                    { variant_id: variantId, quantity: 1 },
                    storeHeaders
                )

                await api.post(
                    `/store/carts/${cart.id}`,
                    {
                        email: "buyer@test.com",
                        shipping_address: {
                            first_name: "Buyer",
                            last_name: "Test",
                            address_1: "123 Main St",
                            city: "New York",
                            country_code: "us",
                            postal_code: "10001",
                        },
                        billing_address: {
                            first_name: "Buyer",
                            last_name: "Test",
                            address_1: "123 Main St",
                            city: "New York",
                            country_code: "us",
                            postal_code: "10001",
                        },
                    },
                    storeHeaders
                )

                const shippingOptionsResp = await api.get(
                    `/store/shipping-options?cart_id=${cart.id}`,
                    storeHeaders
                )
                const allOptions = Object.values(
                    shippingOptionsResp.data.shipping_options as Record<
                        string,
                        { id: string }[]
                    >
                ).flat()
                for (const opt of allOptions) {
                    await api.post(
                        `/store/carts/${cart.id}/shipping-methods`,
                        { option_id: opt.id },
                        storeHeaders
                    )
                }

                const paymentCollection = (
                    await api.post(
                        `/store/payment-collections`,
                        { cart_id: cart.id },
                        storeHeaders
                    )
                ).data.payment_collection
                await api.post(
                    `/store/payment-collections/${paymentCollection.id}/payment-sessions`,
                    { provider_id: "pp_system_default" },
                    storeHeaders
                )

                const completeResp = await api.post(
                    `/store/carts/${cart.id}/complete`,
                    {},
                    storeHeaders
                )
                const orderGroupId = completeResp.data.order_group.id
                const query = appContainer.resolve(
                    ContainerRegistrationKeys.QUERY
                )
                const { data: orderGroup } = await query.graph({
                    entity: "order_group",
                    filters: { id: orderGroupId },
                    fields: ["id", "orders.id"],
                })
                return (orderGroup[0] as { orders: { id: string }[] }).orders[0]
            }

            beforeAll(async () => {
                appContainer = getContainer()
            })

            beforeEach(async () => {
                await createAdminUser(dbConnection, adminHeaders, appContainer)

                const customerResult = await createCustomerUser(appContainer, {
                    email: "adminofferbuyer@test.com",
                    first_name: "Offer",
                    last_name: "Buyer",
                })
                const apiKey = await generatePublishableKey(appContainer)
                const baseStoreHeaders = generateStoreHeaders({
                    publishableKey: apiKey,
                })
                storeHeaders = {
                    headers: {
                        ...baseStoreHeaders.headers,
                        ...customerResult.headers.headers,
                    },
                }

                const salesChannelModule =
                    appContainer.resolve<ISalesChannelModuleService>(
                        Modules.SALES_CHANNEL
                    )
                salesChannel = await salesChannelModule.createSalesChannels({
                    name: "Admin Offer Channel",
                })

                const regionModule = appContainer.resolve<IRegionModuleService>(
                    Modules.REGION
                )
                region = await regionModule.createRegions({
                    name: "Admin Offer Region",
                    currency_code: "usd",
                    countries: ["us"],
                })

                const link = appContainer.resolve(ContainerRegistrationKeys.LINK)
                await link.create({
                    [Modules.REGION]: { region_id: region.id },
                    [Modules.PAYMENT]: {
                        payment_provider_id: "pp_system_default",
                    },
                })

                seller1Seed = await seedSellerOfferWithShipping({
                    email: "admin-offer-seller1@test.com",
                    name: "AdminOfferS1",
                    stocked: 20,
                    offerPrice: 2500,
                })
            })

            describe("POST /admin/order-edits/:id/items", () => {
                it("falls back to default Medusa behavior when no offer_id is in metadata", async () => {
                    const order = await completeCartCheckout(seller1Seed.variant.id)

                    await api.post(
                        `/admin/order-edits`,
                        { order_id: order.id },
                        adminHeaders
                    )

                    // No metadata.offer_id, but explicit unit_price so the
                    // underlying Medusa workflow doesn't need to resolve a
                    // variant price in the order's currency.
                    const addResp = await api.post(
                        `/admin/order-edits/${order.id}/items`,
                        {
                            items: [
                                {
                                    variant_id: seller1Seed.variant.id,
                                    quantity: 1,
                                    unit_price: 1000,
                                },
                            ],
                        },
                        adminHeaders
                    )

                    expect(addResp.status).toEqual(200)
                    expect(addResp.data.order_preview).toBeDefined()
                })
            })
        })
    },
})
