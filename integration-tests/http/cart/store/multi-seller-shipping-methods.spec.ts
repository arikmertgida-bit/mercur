import {
    IRegionModuleService,
    ISalesChannelModuleService,
    MedusaContainer,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

import {
    generatePublishableKey,
    generateStoreHeaders,
} from "../../../helpers/create-admin-user"
import { createCustomerUser } from "../../../helpers/create-customer-user"
import { seedSellerProductWithShipping } from "../../../helpers/split-order-checkout"

jest.setTimeout(120000)

/**
 * Locks the core-flows refresh-cart-shipping-methods patch
 * (packages/core/src/patches): a cart spanning several sellers keeps one
 * shipping method per seller through every cart refresh, and checks out into
 * one order per seller.
 */
medusaIntegrationTestRunner({
    testSuite: ({ getContainer, api }) => {
        describe("Store - Cart multi-seller shipping methods", () => {
            let appContainer: MedusaContainer
            let storeHeaders: any
            let region: any
            let salesChannel: any

            const address = {
                first_name: "Multi",
                last_name: "Buyer",
                address_1: "123 Main St",
                city: "New York",
                country_code: "us",
                postal_code: "10001",
            }

            const addShippingMethod = async (cartId: string, optionId: string) =>
                (
                    await api.post(
                        `/store/carts/${cartId}/shipping-methods`,
                        { option_id: optionId },
                        storeHeaders
                    )
                ).data.cart.shipping_methods as any[]

            const seed = (email: string, name: string, price: number) =>
                seedSellerProductWithShipping({
                    container: appContainer,
                    api,
                    salesChannelId: salesChannel.id,
                    email,
                    name,
                    stocked: 20,
                    price,
                })

            beforeAll(() => {
                appContainer = getContainer()
            })

            beforeEach(async () => {
                const customer = await createCustomerUser(appContainer, {
                    email: "multisellerbuyer@test.com",
                    first_name: "Multi",
                    last_name: "Buyer",
                })
                const apiKey = await generatePublishableKey(appContainer)
                storeHeaders = {
                    headers: {
                        ...generateStoreHeaders({ publishableKey: apiKey }).headers,
                        ...customer.headers.headers,
                    },
                }

                salesChannel = await appContainer
                    .resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)
                    .createSalesChannels({ name: "Default Store" })
                region = await appContainer
                    .resolve<IRegionModuleService>(Modules.REGION)
                    .createRegions({
                        name: "Test Region",
                        currency_code: "usd",
                        countries: ["us"],
                    })
                await appContainer.resolve(ContainerRegistrationKeys.LINK).create({
                    [Modules.REGION]: { region_id: region.id },
                    [Modules.PAYMENT]: { payment_provider_id: "pp_system_default" },
                })
            })

            it("keeps every seller's shipping method and splits the order per seller", async () => {
                const sellerA = await seed("ship-a@test.com", "ShipA", 3000)
                const sellerB = await seed("ship-b@test.com", "ShipB", 1000)

                const cart = (
                    await api.post(
                        `/store/carts`,
                        {
                            region_id: region.id,
                            sales_channel_id: salesChannel.id,
                            currency_code: "usd",
                            email: "multisellerbuyer@test.com",
                            shipping_address: address,
                            billing_address: address,
                        },
                        storeHeaders
                    )
                ).data.cart

                for (const variantId of [sellerA.variantId, sellerB.variantId]) {
                    await api.post(
                        `/store/carts/${cart.id}/line-items`,
                        { variant_id: variantId, quantity: 1 },
                        storeHeaders
                    )
                }

                expect(
                    await addShippingMethod(cart.id, sellerA.shippingOptionId)
                ).toHaveLength(1)

                // The second method triggers the refresh whose orphan-profile
                // cleanup the patch disables.
                const both = await addShippingMethod(
                    cart.id,
                    sellerB.shippingOptionId
                )
                expect(both.map((m) => m.shipping_option_id).sort()).toEqual(
                    [sellerA.shippingOptionId, sellerB.shippingOptionId].sort()
                )

                // Further refreshes (quantity change, cart update) keep both.
                const lineB = (
                    await api.get(`/store/carts/${cart.id}`, storeHeaders)
                ).data.cart.items.find(
                    (i: any) => i.variant_id === sellerB.variantId
                )
                await api.post(
                    `/store/carts/${cart.id}/line-items/${lineB.id}`,
                    { quantity: 2 },
                    storeHeaders
                )
                await api.post(
                    `/store/carts/${cart.id}`,
                    { email: "multisellerbuyer@test.com" },
                    storeHeaders
                )
                const refreshed = (
                    await api.get(`/store/carts/${cart.id}`, storeHeaders)
                ).data.cart
                expect(
                    refreshed.shipping_methods
                        .map((m: any) => m.shipping_option_id)
                        .sort()
                ).toEqual(
                    [sellerA.shippingOptionId, sellerB.shippingOptionId].sort()
                )

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

                const completed = await api.post(
                    `/store/carts/${cart.id}/complete`,
                    {},
                    storeHeaders
                )
                expect(completed.status).toEqual(200)
                expect(completed.data.type).toEqual("order_group")

                const query = appContainer.resolve(ContainerRegistrationKeys.QUERY)
                const { data: groups } = await query.graph({
                    entity: "order_group",
                    filters: { id: completed.data.order_group.id },
                    fields: [
                        "orders.seller.id",
                        "orders.shipping_methods.shipping_option_id",
                    ],
                })
                const orders = (groups[0] as any).orders
                expect(orders).toHaveLength(2)
                for (const seller of [sellerA, sellerB]) {
                    const order = orders.find(
                        (o: any) => o.seller?.id === seller.sellerId
                    )
                    expect(
                        order.shipping_methods.map((m: any) => m.shipping_option_id)
                    ).toEqual([seller.shippingOptionId])
                }
            })
        })
    },
})
