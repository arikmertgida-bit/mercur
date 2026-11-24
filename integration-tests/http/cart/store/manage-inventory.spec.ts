import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  IInventoryService,
  IRegionModuleService,
  ISalesChannelModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import installReservationOversellGuard from "@acme/api/src/migration-scripts/install-reservation-oversell-guard"
import {
  generatePublishableKey,
  generateStoreHeaders,
} from "../../../helpers/create-admin-user"
import { createVendorProduct } from "../../../helpers/create-product"
import { seedSellerProductWithShipping } from "../../../helpers/split-order-checkout"

jest.setTimeout(120000)

/**
 * Variant-level inventory modes on a seller's own product: a variant created
 * without stock is unmanaged, one created with stock is managed, and
 * `allow_backorder` (vendor variant update) lets a managed variant sell past
 * its stock. The PostgreSQL oversell guard
 * (apps/api/src/migration-scripts/install-reservation-oversell-guard.ts) is
 * the last line under all of it.
 */
medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("Store - Cart variant inventory modes", () => {
      let appContainer: MedusaContainer
      let storeHeaders: any
      let region: any
      let salesChannel: any

      const seed = (email: string, name: string, stocked: number) =>
        seedSellerProductWithShipping({
          container: appContainer,
          api,
          salesChannelId: salesChannel.id,
          email,
          name,
          stocked,
          price: 2500,
        })

      const createStocklessProduct = async (
        seller: Awaited<ReturnType<typeof seed>>
      ) => {
        const product = await createVendorProduct(api, seller.headers, {
          title: `Stockless ${Date.now()}`,
          variants: [
            {
              title: "Default",
              sku: `STOCKLESS-${Date.now()}`,
              prices: [{ amount: 2500, currency_code: "usd" }],
            },
          ],
          extra: { shipping_profile_id: seller.shippingProfileId },
        })
        await api.post(
          `/vendor/sales-channels/${salesChannel.id}/products`,
          { add: [product.id] },
          seller.headers
        )
        return product
      }

      const getVariant = async (
        seller: Awaited<ReturnType<typeof seed>>,
        productId: string,
        variantId: string
      ) =>
        (
          await api.get(
            `/vendor/products/${productId}/variants/${variantId}?fields=manage_inventory,allow_backorder`,
            seller.headers
          )
        ).data.variant

      const allowBackorder = async (
        seller: Awaited<ReturnType<typeof seed>>,
        allow: boolean
      ) => {
        const response = await api.post(
          `/vendor/products/${seller.product.id}/variants/${seller.variantId}`,
          { allow_backorder: allow },
          seller.headers
        )
        expect(response.status).toEqual(202)
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

      const addLine = (cartId: string, variantId: string, quantity: number) =>
        api
          .post(
            `/store/carts/${cartId}/line-items`,
            { variant_id: variantId, quantity },
            storeHeaders
          )
          .catch((e) => e.response)

      const inventoryOf = async (variantId: string) => {
        const query = appContainer.resolve(ContainerRegistrationKeys.QUERY)
        const { data } = await query.graph({
          entity: "variant",
          filters: { id: variantId },
          fields: ["inventory_items.inventory_item_id"],
        })
        return (data[0] as any).inventory_items[0].inventory_item_id as string
      }

      /** A cart holding `variantId`, shipped and ready to complete. */
      const prepareCheckout = async (
        seller: Awaited<ReturnType<typeof seed>>,
        email: string
      ) => {
        const cart = await createCart()
        const added = await addLine(cart.id, seller.variantId, 1)
        expect(added.status).toEqual(200)

        const address = {
          first_name: "Last",
          last_name: "Unit",
          address_1: "123 Main St",
          city: "New York",
          country_code: "us",
          postal_code: "10001",
        }
        await api.post(
          `/store/carts/${cart.id}`,
          { email, shipping_address: address, billing_address: address },
          storeHeaders
        )
        await api.post(
          `/store/carts/${cart.id}/shipping-methods`,
          { option_id: seller.shippingOptionId },
          storeHeaders
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
        return cart.id as string
      }

      const complete = (cartId: string) =>
        api
          .post(`/store/carts/${cartId}/complete`, {}, storeHeaders)
          .catch((e) => e.response)

      beforeAll(async () => {
        appContainer = getContainer()
        await installReservationOversellGuard({
          container: appContainer,
          args: [],
        })
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

      // Seller variants are always stock-tracked (9e-2b-1): one created without
      // a stock entry is tracked with 0 stock, never sold without limit.
      it("tracks stock for every seller variant, even one created without stock", async () => {
        const seller = await seed("inv-flags@test.com", "InvFlags", 5)
        const unmanaged = await createStocklessProduct(seller)

        const managedVariant = await getVariant(
          seller,
          seller.product.id,
          seller.variantId
        )
        expect(managedVariant.manage_inventory).toEqual(true)
        expect(managedVariant.allow_backorder).toEqual(false)

        const unmanagedVariant = await getVariant(
          seller,
          unmanaged.id,
          unmanaged.variants[0].id
        )
        expect(unmanagedVariant.manage_inventory).toEqual(true)
      })

      it("does not sell a variant created without stock", async () => {
        const seller = await seed("inv-unmanaged@test.com", "InvUnmanaged", 1)
        const unmanaged = await createStocklessProduct(seller)

        const cart = await createCart()
        const response = await addLine(cart.id, unmanaged.variants[0].id, 1)

        expect(response.status).toBeGreaterThanOrEqual(400)
        expect(response.status).toBeLessThan(500)
      })

      it("blocks adding more of a managed variant than is in stock", async () => {
        const seller = await seed("inv-managed@test.com", "InvManaged", 3)

        const cart = await createCart()
        const response = await addLine(cart.id, seller.variantId, 10)

        expect(response.status).toBeGreaterThanOrEqual(400)
        expect(response.status).toBeLessThan(500)
        expect(JSON.stringify(response.data)).toMatch(
          /INSUFFICIENT_INVENTORY|stock|inventory/i
        )
      })

      it("sells a backorder variant past its stock and keeps the flag switchable", async () => {
        const seller = await seed("inv-backorder@test.com", "InvBackorder", 1)
        await allowBackorder(seller, true)
        expect(
          (await getVariant(seller, seller.product.id, seller.variantId))
            .allow_backorder
        ).toEqual(true)

        const cart = await createCart()
        const response = await addLine(cart.id, seller.variantId, 100)
        expect(response.status).toEqual(200)
        expect(response.data.cart.items[0].quantity).toEqual(100)

        await allowBackorder(seller, false)
        expect(
          (await getVariant(seller, seller.product.id, seller.variantId))
            .allow_backorder
        ).toEqual(false)

        const blockedCart = await createCart()
        const blocked = await addLine(blockedCart.id, seller.variantId, 100)
        expect(blocked.status).toBeGreaterThanOrEqual(400)
      })

      it("sells the last unit to one buyer only", async () => {
        const seller = await seed("inv-last@test.com", "InvLast", 1)

        const first = await prepareCheckout(seller, "first-buyer@test.com")
        const second = await prepareCheckout(seller, "second-buyer@test.com")

        const won = await complete(first)
        expect(won.status).toEqual(200)
        expect(won.data.type).toEqual("order_group")

        const lost = await complete(second)
        expect(lost.data.type).not.toEqual("order_group")

        const inventory = appContainer.resolve<IInventoryService>(
          Modules.INVENTORY
        )
        const reservations = await inventory.listReservationItems({
          inventory_item_id: await inventoryOf(seller.variantId),
        })
        expect(
          reservations.reduce((sum, r) => sum + Number(r.quantity), 0)
        ).toEqual(1)
      })

      it("refuses a reservation beyond stock in the inventory module", async () => {
        const seller = await seed("inv-module@test.com", "InvModule", 2)
        const inventory = appContainer.resolve<IInventoryService>(
          Modules.INVENTORY
        )

        await expect(
          inventory.createReservationItems([
            {
              inventory_item_id: await inventoryOf(seller.variantId),
              location_id: seller.stockLocationId,
              quantity: 3,
            },
          ])
        ).rejects.toThrow(/Not enough stock/)
      })

      // The module check above is a read-then-write; the trigger is what
      // still holds when two reservations race past it. A direct insert is
      // the only way to reach it deterministically.
      it("rejects an over-stock reservation row at the database, unless backordered", async () => {
        const seller = await seed("inv-guard@test.com", "InvGuard", 2)
        const inventoryItemId = await inventoryOf(seller.variantId)
        const pg = appContainer.resolve(ContainerRegistrationKeys.PG_CONNECTION)

        const insertReservation = (id: string, allowBackorder: boolean) =>
          pg("reservation_item").insert({
            id,
            inventory_item_id: inventoryItemId,
            location_id: seller.stockLocationId,
            quantity: 3,
            raw_quantity: { value: "3", precision: 20 },
            allow_backorder: allowBackorder,
          })

        await expect(insertReservation("resitem_guard_blocked", false)).rejects.toThrow(
          /INVENTORY_OVERSELL_BLOCKED/
        )
        await expect(
          insertReservation("resitem_guard_backorder", true)
        ).resolves.toBeDefined()
      })
    })
  },
})
