import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  IRegionModuleService,
  ISalesChannelModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  generatePublishableKey,
  generateStoreHeaders,
} from "../../../helpers/create-admin-user"
import { createCustomerUser } from "../../../helpers/create-customer-user"
import { createVendorProduct } from "../../../helpers/create-product"
import { seedSellerProductWithShipping } from "../../../helpers/split-order-checkout"

jest.setTimeout(120000)

type Seed = Awaited<ReturnType<typeof seedSellerProductWithShipping>>

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
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

      // KNOWN BUG (next part, 9e-2b-5): Medusa spreads the fixed amount over
      // every line, then the seller scope drops the other seller's share, so
      // this cart gets 200 instead of 500. Remove .failing with the fix.
      it.failing("gives a seller's fixed order discount in full in a multi-seller cart", async () => {
        const sellerA = await seed("cart-order-a@test.com", "CartOrderA", 2000)
        const sellerB = await seed("cart-order-b@test.com", "CartOrderB", 3000)
        await api.post(
          `/vendor/promotions`,
          {
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
          sellerA.headers
        )

        const cart = await createCart()
        await addLines(cart.id, [sellerA.variantId, sellerB.variantId])
        expectOnlyFirstDiscounted(await getCart(cart.id), sellerA, sellerB, 500)
      })

      it("does not carry a seller promotion onto another seller's split order", async () => {
        const customer = await createCustomerUser(appContainer, {
          email: "split-promo-buyer@test.com",
          first_name: "Split",
          last_name: "Buyer",
        })
        const buyerHeaders = {
          headers: { ...storeHeaders.headers, ...customer.headers.headers },
        }

        const sellerA = await seed("cart-split-a@test.com", "CartSplitA", 2000)
        const sellerB = await seed("cart-split-b@test.com", "CartSplitB", 3000)
        const promotion = await createUntargetedPromotion(sellerA, true)

        const cart = await createCart(buyerHeaders)
        await addLines(cart.id, [sellerA.variantId, sellerB.variantId], buyerHeaders)

        const address = {
          first_name: "Split",
          last_name: "Buyer",
          address_1: "123 Main St",
          city: "New York",
          country_code: "us",
          postal_code: "10001",
        }
        await api.post(
          `/store/carts/${cart.id}`,
          {
            email: customer.customer.email,
            shipping_address: address,
            billing_address: address,
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

        expectOnlyFirstDiscounted(
          await getCart(cart.id, buyerHeaders),
          sellerA,
          sellerB,
          200
        )

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

        const completed = await api.post(
          `/store/carts/${cart.id}/complete`,
          {},
          buyerHeaders
        )
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
