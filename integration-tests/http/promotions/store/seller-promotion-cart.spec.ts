import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  IRegionModuleService,
  ISalesChannelModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  adminHeaders,
  createAdminUser,
  generatePublishableKey,
  generateStoreHeaders,
} from "../../../helpers/create-admin-user"
import { createCustomerUser } from "../../../helpers/create-customer-user"
import { createVendorProduct } from "../../../helpers/create-product"
import { seedSellerProductWithShipping } from "../../../helpers/split-order-checkout"

jest.setTimeout(120000)

type Seed = Awaited<ReturnType<typeof seedSellerProductWithShipping>>

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api, dbConnection }) => {
    describe("Store - Cart seller promotion", () => {
      let appContainer: MedusaContainer
      let storeHeaders: any
      let region: any
      let salesChannel: any

      const seed = (email: string, name: string, price: number) =>
        seedSellerProductWithShipping({
          container: appContainer,
          api,
          salesChannelId: salesChannel.id,
          email,
          name,
          stocked: 10,
          price,
        })

      const reserveCode = async (headers: any) =>
        (await api.get(`/vendor/promotions/generate-code`, headers)).data

      /** A coded promotion of `seller` targeting the given products. */
      const createTargetedPromotion = async (
        seller: Seed,
        productIds: string[],
        value: number,
        type: "fixed" | "percentage" = "fixed"
      ): Promise<string> => {
        const reservation = await reserveCode(seller.headers)
        await api.post(
          `/vendor/promotions`,
          {
            code_reservation_token: reservation.code_reservation_token,
            type: "standard",
            status: "active",
            application_method: {
              type,
              target_type: "items",
              allocation: "each",
              value,
              ...(type === "fixed" ? { currency_code: "usd" } : {}),
              max_quantity: 1,
              target_rules: [
                {
                  attribute: "items.product.id",
                  operator: "in",
                  values: productIds,
                },
              ],
            },
          },
          seller.headers
        )
        return reservation.code
      }

      /** A 10% promotion of `seller` with no target rule of its own. */
      const createUntargetedPromotion = async (
        seller: Seed,
        isAutomatic: boolean
      ): Promise<{ id: string; code: string }> => {
        const reservation = isAutomatic
          ? null
          : await reserveCode(seller.headers)
        const promotion = (
          await api.post(
            `/vendor/promotions`,
            {
              ...(reservation
                ? { code_reservation_token: reservation.code_reservation_token }
                : {}),
              type: "standard",
              status: "active",
              is_automatic: isAutomatic,
              application_method: {
                type: "percentage",
                target_type: "items",
                allocation: "each",
                value: 10,
                max_quantity: 1,
              },
            },
            seller.headers
          )
        ).data.promotion
        return { id: promotion.id, code: promotion.code }
      }

      /** An automatic fixed "across" promotion of `seller` (order or shipping). */
      const createFixedAcrossPromotion = async (
        seller: Seed,
        targetType: "order" | "shipping_methods",
        value: number,
        campaignId?: string
      ): Promise<{ id: string }> =>
        (
          await api.post(
            `/vendor/promotions`,
            {
              type: "standard",
              status: "active",
              is_automatic: true,
              ...(campaignId ? { campaign_id: campaignId } : {}),
              application_method: {
                type: "fixed",
                target_type: targetType,
                allocation: "across",
                value,
                currency_code: "usd",
              },
            },
            seller.headers
          )
        ).data.promotion

      const checkoutAddress = {
        first_name: "Split",
        last_name: "Buyer",
        address_1: "123 Main St",
        city: "New York",
        country_code: "us",
        postal_code: "10001",
      }

      /** A customer cart with one line of each seller and both shipping methods. */
      const prepareTwoSellerCheckout = async (
        email: string,
        sellerA: Seed,
        sellerB: Seed
      ) => {
        const customer = await createCustomerUser(appContainer, {
          email,
          first_name: "Split",
          last_name: "Buyer",
        })
        const buyerHeaders = {
          headers: { ...storeHeaders.headers, ...customer.headers.headers },
        }

        const cart = await createCart(buyerHeaders)
        await addLines(cart.id, [sellerA.variantId, sellerB.variantId], buyerHeaders)
        await api.post(
          `/store/carts/${cart.id}`,
          {
            email: customer.customer.email,
            shipping_address: checkoutAddress,
            billing_address: checkoutAddress,
          },
          buyerHeaders
        )
        for (const optionId of [sellerA.shippingOptionId, sellerB.shippingOptionId]) {
          await api.post(
            `/store/carts/${cart.id}/shipping-methods`,
            { option_id: optionId },
            buyerHeaders
          )
        }

        const complete = async () => {
          const paymentCollection = (
            await api.post(
              `/store/payment-collections`,
              { cart_id: cart.id },
              buyerHeaders
            )
          ).data.payment_collection
          await api.post(
            `/store/payment-collections/${paymentCollection.id}/payment-sessions`,
            { provider_id: "pp_system_default" },
            buyerHeaders
          )
          return api.post(`/store/carts/${cart.id}/complete`, {}, buyerHeaders)
        }

        return { cartId: cart.id, buyerHeaders, complete }
      }

      const createCart = async (headers = storeHeaders) =>
        (
          await api.post(
            `/store/carts`,
            {
              region_id: region.id,
              sales_channel_id: salesChannel.id,
              currency_code: "usd",
            },
            headers
          )
        ).data.cart

      const addLines = async (
        cartId: string,
        variantIds: string[],
        headers = storeHeaders
      ) => {
        for (const variantId of variantIds) {
          await api.post(
            `/store/carts/${cartId}/line-items`,
            { variant_id: variantId, quantity: 1 },
            headers
          )
        }
      }

      const applyCode = (cartId: string, code: string) =>
        api.post(
          `/store/carts/${cartId}/promotions`,
          { promo_codes: [code] },
          storeHeaders
        )

      const getCart = async (cartId: string, headers = storeHeaders) =>
        (await api.get(`/store/carts/${cartId}`, headers)).data.cart

      const findLine = (cart: any, variantId: string) =>
        cart.items.find((i: any) => i.variant_id === variantId)

      const expectOnlyFirstDiscounted = (
        cart: any,
        discounted: Seed,
        untouched: Seed,
        amount: number
      ) => {
        const lineA = findLine(cart, discounted.variantId)
        const lineB = findLine(cart, untouched.variantId)
        expect(lineA.adjustments).toHaveLength(1)
        expect(lineA.adjustments[0].amount).toEqual(amount)
        expect(lineB.adjustments ?? []).toHaveLength(0)
        expect(cart.discount_total).toEqual(amount)
      }

      beforeAll(() => {
        appContainer = getContainer()
      })

      beforeEach(async () => {
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

        const apiKey = await generatePublishableKey(appContainer)
        storeHeaders = generateStoreHeaders({ publishableKey: apiKey })
      })

      it("applies a fixed discount to the targeted product", async () => {
        const seller = await seed("cart-promo@test.com", "CartPromo", 2000)
        const code = await createTargetedPromotion(seller, [seller.product.id], 500)

        const cart = await createCart()
        await addLines(cart.id, [seller.variantId])
        const response = await applyCode(cart.id, code)

        expect(response.status).toEqual(200)
        const line = response.data.cart.items[0]
        expect(line.adjustments).toHaveLength(1)
        expect(line.adjustments[0].amount).toEqual(500)
        expect(response.data.cart.discount_total).toEqual(500)
        expect(response.data.cart.item_subtotal).toEqual(2000)
        expect(response.data.cart.total).toEqual(1500)
      })

      it("applies a percentage discount and reduces the cart total", async () => {
        const seller = await seed("cart-pct@test.com", "CartPct", 2000)
        const code = await createTargetedPromotion(
          seller,
          [seller.product.id],
          10,
          "percentage"
        )

        const cart = await createCart()
        await addLines(cart.id, [seller.variantId])
        const response = await applyCode(cart.id, code)

        expect(response.status).toEqual(200)
        const line = response.data.cart.items[0]
        expect(line.adjustments[0].amount).toEqual(200)
        expect(response.data.cart.discount_total).toEqual(200)
        expect(response.data.cart.total).toEqual(1800)
      })

      it("discounts only the promoting seller's product in a multi-seller cart", async () => {
        const sellerA = await seed("cart-multi-a@test.com", "CartMultiA", 2000)
        const sellerB = await seed("cart-multi-b@test.com", "CartMultiB", 3000)
        const code = await createTargetedPromotion(
          sellerA,
          [sellerA.product.id],
          500
        )

        const cart = await createCart()
        await addLines(cart.id, [sellerA.variantId, sellerB.variantId])
        const response = await applyCode(cart.id, code)

        expect(response.status).toEqual(200)
        expectOnlyFirstDiscounted(response.data.cart, sellerA, sellerB, 500)
        expect(response.data.cart.item_subtotal).toEqual(5000)
        expect(response.data.cart.total).toEqual(4500)
      })

      it("rejects a promotion rule that names another seller's product", async () => {
        const sellerA = await seed("cart-cross-a@test.com", "CartCrossA", 2000)
        const sellerB = await seed("cart-cross-b@test.com", "CartCrossB", 3000)
        const reservation = await reserveCode(sellerA.headers)

        const created = await api
          .post(
            `/vendor/promotions`,
            {
              code_reservation_token: reservation.code_reservation_token,
              type: "standard",
              status: "active",
              application_method: {
                type: "fixed",
                target_type: "items",
                allocation: "each",
                value: 500,
                currency_code: "usd",
                max_quantity: 1,
                target_rules: [
                  {
                    attribute: "items.product.id",
                    operator: "in",
                    values: [sellerA.product.id, sellerB.product.id],
                  },
                ],
              },
            },
            sellerA.headers
          )
          .catch((e) => e)

        expect(created.response.status).toEqual(400)
        expect(created.response.data.code).toEqual("promotion_product_not_owned")

        const { id: promotionId } = await createUntargetedPromotion(sellerA, false)
        const batched = await api
          .post(
            `/vendor/promotions/${promotionId}/target-rules/batch`,
            {
              create: [
                {
                  attribute: "items.product.id",
                  operator: "in",
                  values: [sellerB.product.id],
                },
              ],
            },
            sellerA.headers
          )
          .catch((e) => e)

        expect(batched.response.status).toEqual(400)
        expect(batched.response.data.code).toEqual("promotion_product_not_owned")

        const own = await api.post(
          `/vendor/promotions/${promotionId}/target-rules/batch`,
          {
            create: [
              {
                attribute: "items.product.id",
                operator: "in",
                values: [sellerA.product.id],
              },
            ],
          },
          sellerA.headers
        )
        expect(own.status).toEqual(200)
      })

      it("keeps an untargeted seller promotion scoped across cart refreshes", async () => {
        const sellerA = await seed("cart-refresh-a@test.com", "CartRefreshA", 2000)
        const sellerB = await seed("cart-refresh-b@test.com", "CartRefreshB", 3000)
        const { code } = await createUntargetedPromotion(sellerA, false)

        const cart = await createCart()
        await addLines(cart.id, [sellerA.variantId, sellerB.variantId])

        const applied = await applyCode(cart.id, code)
        expect(applied.status).toEqual(200)
        expectOnlyFirstDiscounted(applied.data.cart, sellerA, sellerB, 200)

        await api.post(
          `/store/carts/${cart.id}`,
          { email: "refresh-buyer@test.com" },
          storeHeaders
        )
        expectOnlyFirstDiscounted(await getCart(cart.id), sellerA, sellerB, 200)

        const lineB = findLine(await getCart(cart.id), sellerB.variantId)
        await api.post(
          `/store/carts/${cart.id}/line-items/${lineB.id}`,
          { quantity: 2 },
          storeHeaders
        )
        expectOnlyFirstDiscounted(await getCart(cart.id), sellerA, sellerB, 200)
      })

      it("applies an automatic seller promotion only to that seller's items", async () => {
        const sellerA = await seed("cart-auto-a@test.com", "CartAutoA", 2000)
        const sellerB = await seed("cart-auto-b@test.com", "CartAutoB", 3000)
        await createUntargetedPromotion(sellerA, true)

        const cart = await createCart()
        await addLines(cart.id, [sellerA.variantId, sellerB.variantId])
        expectOnlyFirstDiscounted(await getCart(cart.id), sellerA, sellerB, 200)

        await api.post(
          `/store/carts/${cart.id}`,
          { email: "auto-buyer@test.com" },
          storeHeaders
        )
        expectOnlyFirstDiscounted(await getCart(cart.id), sellerA, sellerB, 200)
      })

      it("gives a seller's fixed order discount in full in a multi-seller cart", async () => {
        const sellerA = await seed("cart-order-a@test.com", "CartOrderA", 2000)
        const sellerB = await seed("cart-order-b@test.com", "CartOrderB", 3000)
        await createFixedAcrossPromotion(sellerA, "order", 500)

        const cart = await createCart()
        await addLines(cart.id, [sellerA.variantId, sellerB.variantId])
        expectOnlyFirstDiscounted(await getCart(cart.id), sellerA, sellerB, 500)

        await api.post(
          `/store/carts/${cart.id}`,
          { email: "order-refresh@test.com" },
          storeHeaders
        )
        expectOnlyFirstDiscounted(await getCart(cart.id), sellerA, sellerB, 500)
      })

      it("gives a coded seller fixed order discount in full in a multi-seller cart", async () => {
        const sellerA = await seed("cart-ordercode-a@test.com", "CartOrderCodeA", 2000)
        const sellerB = await seed("cart-ordercode-b@test.com", "CartOrderCodeB", 3000)
        const reservation = await reserveCode(sellerA.headers)
        await api.post(
          `/vendor/promotions`,
          {
            code_reservation_token: reservation.code_reservation_token,
            type: "standard",
            status: "active",
            application_method: {
              type: "fixed",
              target_type: "order",
              allocation: "across",
              value: 500,
              currency_code: "usd",
            },
          },
          sellerA.headers
        )

        const cart = await createCart()
        await addLines(cart.id, [sellerA.variantId, sellerB.variantId])
        const applied = await applyCode(cart.id, reservation.code)
        expect(applied.status).toEqual(200)
        expectOnlyFirstDiscounted(applied.data.cart, sellerA, sellerB, 500)
        expect(applied.data.cart.total).toEqual(4500)
      })

      it("caps a seller's fixed order discount at that seller's lines", async () => {
        const sellerA = await seed("cart-ordercap-a@test.com", "CartOrderCapA", 2000)
        const sellerB = await seed("cart-ordercap-b@test.com", "CartOrderCapB", 3000)
        await createFixedAcrossPromotion(sellerA, "order", 4000)

        const cart = await createCart()
        await addLines(cart.id, [sellerA.variantId, sellerB.variantId])
        expectOnlyFirstDiscounted(await getCart(cart.id), sellerA, sellerB, 2000)
      })

      it("gives each seller's fixed order discount in full on its own lines", async () => {
        const sellerA = await seed("cart-ordertwo-a@test.com", "CartOrderTwoA", 2000)
        const sellerB = await seed("cart-ordertwo-b@test.com", "CartOrderTwoB", 3000)
        await createFixedAcrossPromotion(sellerA, "order", 500)
        await createFixedAcrossPromotion(sellerB, "order", 300)

        const cart = await createCart()
        await addLines(cart.id, [sellerA.variantId, sellerB.variantId])
        const refreshed = await getCart(cart.id)

        const lineA = findLine(refreshed, sellerA.variantId)
        const lineB = findLine(refreshed, sellerB.variantId)
        expect(lineA.adjustments.map((a: any) => a.amount)).toEqual([500])
        expect(lineB.adjustments.map((a: any) => a.amount)).toEqual([300])
        expect(refreshed.discount_total).toEqual(800)
      })

      it("spreads a platform fixed order discount over every seller", async () => {
        await createAdminUser(dbConnection, adminHeaders, appContainer)
        const sellerA = await seed("cart-orderplat-a@test.com", "CartOrderPlatA", 2000)
        const sellerB = await seed("cart-orderplat-b@test.com", "CartOrderPlatB", 3000)
        await api.post(
          `/admin/promotions`,
          {
            code: "PLATFORMFIXED500",
            type: "standard",
            status: "active",
            is_automatic: true,
            application_method: {
              type: "fixed",
              target_type: "order",
              allocation: "across",
              value: 500,
              currency_code: "usd",
            },
          },
          adminHeaders
        )

        const cart = await createCart()
        await addLines(cart.id, [sellerA.variantId, sellerB.variantId])
        const refreshed = await getCart(cart.id)

        expect(findLine(refreshed, sellerA.variantId).adjustments[0].amount).toEqual(200)
        expect(findLine(refreshed, sellerB.variantId).adjustments[0].amount).toEqual(300)
        expect(refreshed.discount_total).toEqual(500)
      })

      it("gives a seller's fixed shipping discount in full on that seller's shipping", async () => {
        const sellerA = await seed("cart-ship-a@test.com", "CartShipA", 2000)
        const sellerB = await seed("cart-ship-b@test.com", "CartShipB", 3000)
        await createFixedAcrossPromotion(sellerA, "shipping_methods", 300)

        const { cartId, buyerHeaders } = await prepareTwoSellerCheckout(
          "ship-promo-buyer@test.com",
          sellerA,
          sellerB
        )
        const cart = await getCart(cartId, buyerHeaders)
        const methodOf = (seller: Seed) =>
          cart.shipping_methods.find(
            (sm: any) => sm.shipping_option_id === seller.shippingOptionId
          )

        expect(methodOf(sellerA).adjustments.map((a: any) => a.amount)).toEqual([300])
        expect(methodOf(sellerB).adjustments ?? []).toHaveLength(0)
        expect(cart.shipping_discount_total).toEqual(300)
      })

      it("keeps a seller's fixed order discount whole through the split order and its budget", async () => {
        const sellerA = await seed("cart-ordersplit-a@test.com", "CartOrderSplitA", 2000)
        const sellerB = await seed("cart-ordersplit-b@test.com", "CartOrderSplitB", 3000)
        const campaign = (
          await api.post(
            `/vendor/campaigns`,
            {
              name: "Fixed order campaign",
              campaign_identifier: "fixed-order-split",
              budget: { type: "spend", limit: 10000, currency_code: "usd" },
            },
            sellerA.headers
          )
        ).data.campaign
        const promotion = await createFixedAcrossPromotion(
          sellerA,
          "order",
          500,
          campaign.id
        )

        const checkout = await prepareTwoSellerCheckout(
          "order-split-buyer@test.com",
          sellerA,
          sellerB
        )
        expectOnlyFirstDiscounted(
          await getCart(checkout.cartId, checkout.buyerHeaders),
          sellerA,
          sellerB,
          500
        )

        const completed = await checkout.complete()
        expect(completed.status).toEqual(200)
        expect(completed.data.type).toEqual("order_group")

        const query = appContainer.resolve(ContainerRegistrationKeys.QUERY)
        const { data: groups } = await query.graph({
          entity: "order_group",
          filters: { id: completed.data.order_group.id },
          fields: [
            "orders.seller.id",
            "orders.discount_total",
            "orders.items.adjustments.amount",
            "orders.items.adjustments.promotion_id",
          ],
        })
        const orderOf = (sellerId: string) =>
          (groups[0] as any).orders.find((o: any) => o.seller?.id === sellerId)

        const orderA = orderOf(sellerA.sellerId)
        const orderB = orderOf(sellerB.sellerId)
        expect(Number(orderA.discount_total)).toEqual(500)
        expect(
          orderA.items.flatMap((i: any) => i.adjustments).map((a: any) => a.promotion_id)
        ).toEqual([promotion.id])
        expect(Number(orderB.discount_total)).toEqual(0)
        expect(orderB.items.flatMap((i: any) => i.adjustments ?? [])).toHaveLength(0)

        const { data: campaigns } = await query.graph({
          entity: "campaign",
          filters: { id: campaign.id },
          fields: ["budget.used"],
        })
        expect(Number((campaigns[0] as any).budget.used)).toEqual(500)
      })

      it("does not carry a seller promotion onto another seller's split order", async () => {
        const sellerA = await seed("cart-split-a@test.com", "CartSplitA", 2000)
        const sellerB = await seed("cart-split-b@test.com", "CartSplitB", 3000)
        const promotion = await createUntargetedPromotion(sellerA, true)

        const checkout = await prepareTwoSellerCheckout(
          "split-promo-buyer@test.com",
          sellerA,
          sellerB
        )
        expectOnlyFirstDiscounted(
          await getCart(checkout.cartId, checkout.buyerHeaders),
          sellerA,
          sellerB,
          200
        )

        const completed = await checkout.complete()
        expect(completed.status).toEqual(200)
        expect(completed.data.type).toEqual("order_group")

        const query = appContainer.resolve(ContainerRegistrationKeys.QUERY)
        const { data: groups } = await query.graph({
          entity: "order_group",
          filters: { id: completed.data.order_group.id },
          fields: [
            "orders.seller.id",
            "orders.items.adjustments.promotion_id",
            "orders.shipping_methods.adjustments.promotion_id",
          ],
        })
        const orders = (groups[0] as any).orders
        const adjustmentsOf = (sellerId: string) => {
          const order = orders.find((o: any) => o.seller?.id === sellerId)
          expect(order).toBeDefined()
          return [
            ...order.items.flatMap((i: any) => i.adjustments ?? []),
            ...(order.shipping_methods ?? []).flatMap(
              (sm: any) => sm.adjustments ?? []
            ),
          ]
        }

        expect(
          adjustmentsOf(sellerA.sellerId).map((a: any) => a.promotion_id)
        ).toContain(promotion.id)
        expect(adjustmentsOf(sellerB.sellerId)).toHaveLength(0)
      })

      it("does not discount a product the promotion is not targeting", async () => {
        const seller = await seed("cart-untargeted@test.com", "CartUntargeted", 2000)
        const targeted = await createVendorProduct(api, seller.headers, {
          title: "CartUntargeted second product",
          variants: [
            {
              title: "Default",
              sku: "CART-UNTARGETED-2",
              prices: [{ amount: 1000, currency_code: "usd" }],
              inventory: [{ location_id: seller.stockLocationId, quantity: 10 }],
            },
          ],
          extra: { shipping_profile_id: seller.shippingProfileId },
        })
        const code = await createTargetedPromotion(seller, [targeted.id], 500)

        const cart = await createCart()
        await addLines(cart.id, [seller.variantId])
        const response = await applyCode(cart.id, code)

        expect(response.status).toEqual(200)
        expect(response.data.cart.items[0].adjustments ?? []).toHaveLength(0)
        expect(response.data.cart.discount_total).toEqual(0)
      })
    })
  },
})
