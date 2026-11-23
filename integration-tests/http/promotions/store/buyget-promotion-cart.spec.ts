import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  IRegionModuleService,
  ISalesChannelModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { createSellerUser } from "../../../helpers/create-seller-user"
import { approveSeller } from "../../../helpers/split-order-checkout"
import { createShippingProfile } from "../../../helpers/create-shipping-profile"
import {
  generatePublishableKey,
  generateStoreHeaders,
} from "../../../helpers/create-admin-user"
import { createVendorProduct } from "../../../helpers/create-product"

jest.setTimeout(120000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("Store - Cart buyget promotion", () => {
      let appContainer: MedusaContainer
      let storeHeaders: any
      let region: any
      let salesChannel: any
      let sellerHeaders: any
      let sellerId: string

      const seedProduct = async (opts: {
        name: string
        price: number
        sku: string
        headers: any
        sellerId: string
      }) => {
        const tag = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
        const headers = opts.headers

        const stockLocation = (
          await api.post(
            `/vendor/stock-locations`,
            { name: `${opts.name} WH ${tag}` },
            headers
          )
        ).data.stock_location

        await api.post(
          `/vendor/stock-locations/${stockLocation.id}/sales-channels`,
          { add: [salesChannel.id] },
          headers
        )

        const shippingProfile = await createShippingProfile(
          appContainer,
          { name: `${opts.name} Profile ${tag}` },
          { seller_id: opts.sellerId }
        )

        const product = await createVendorProduct(api, headers, {
          title: `${opts.name} Product ${tag}`,
          variants: [
            {
              title: "Default",
              sku: `${opts.sku}-V-${tag}`,
              prices: [{ amount: opts.price, currency_code: "usd" }],
              inventory: [{ location_id: stockLocation.id, quantity: 10 }],
            },
          ],
          extra: { shipping_profile_id: shippingProfile.id },
        })

        await api.post(
          `/vendor/sales-channels/${salesChannel.id}/products`,
          { add: [product.id] },
          headers
        )

        return { productId: product.id, variantId: product.variants[0].id }
      }

      const createCart = async () =>
        (
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

        const seller = await createSellerUser(appContainer, {
          email: `buyget-cart-${Date.now()}@test.com`,
          name: "Buyget Cart Seller",
        })
        sellerHeaders = seller.headers
        sellerId = seller.seller.id
        await approveSeller(appContainer, sellerId)
      })

      it("discounts the 'get' product when the 'buy' product is in the cart", async () => {
        const buy = await seedProduct({
          name: "Buy",
          price: 2000,
          sku: `BUYGET-BUY-${Date.now()}`,
          headers: sellerHeaders,
          sellerId,
        })
        const get = await seedProduct({
          name: "Get",
          price: 1000,
          sku: `BUYGET-GET-${Date.now()}`,
          headers: sellerHeaders,
          sellerId,
        })

        const reservation = await api.get(
          `/vendor/promotions/generate-code`,
          sellerHeaders
        )

        await api.post(
          `/vendor/promotions`,
          {
            code_reservation_token: reservation.data.code_reservation_token,
            type: "buyget",
            status: "active",
            application_method: {
              type: "percentage",
              target_type: "items",
              allocation: "each",
              value: 100,
              max_quantity: 1,
              apply_to_quantity: 1,
              buy_rules_min_quantity: 1,
              target_rules: [
                {
                  attribute: "items.product.id",
                  operator: "in",
                  values: [get.productId],
                },
              ],
              buy_rules: [
                {
                  attribute: "items.product.id",
                  operator: "in",
                  values: [buy.productId],
                },
              ],
            },
          },
          sellerHeaders
        )

        const cart = await createCart()

        await api.post(
          `/store/carts/${cart.id}/line-items`,
          { variant_id: buy.variantId, quantity: 1 },
          storeHeaders
        )
        await api.post(
          `/store/carts/${cart.id}/line-items`,
          { variant_id: get.variantId, quantity: 1 },
          storeHeaders
        )

        const response = await api.post(
          `/store/carts/${cart.id}/promotions`,
          { promo_codes: [reservation.data.code] },
          storeHeaders
        )

        expect(response.status).toEqual(200)

        const items = response.data.cart.items
        const buyLine = items.find(
          (i: any) => i.variant_id === buy.variantId
        )
        const getLine = items.find(
          (i: any) => i.variant_id === get.variantId
        )

        expect(getLine.adjustments).toHaveLength(1)
        expect(getLine.adjustments[0].amount).toEqual(1000)
        expect(buyLine.adjustments ?? []).toHaveLength(0)
        expect(response.data.cart.discount_total).toEqual(1000)
      })
    })
  },
})
