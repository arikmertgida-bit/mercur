import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  IRegionModuleService,
  ISalesChannelModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { createCustomerUser } from "../../../helpers/create-customer-user"
import {
  generatePublishableKey,
  generateStoreHeaders,
} from "../../../helpers/create-admin-user"
import {
  completeSplitOrderCheckout,
  seedSellerProductWithShipping,
} from "../../../helpers/split-order-checkout"

jest.setTimeout(180000)

type RequestHeaders = { headers: Record<string, string> }
type Seed = { headers: RequestHeaders; variantId: string }

const BUYER_EMAIL = "add-items-buyer@test.com"

type AddItemsRoute = {
  name: string
  begin: (orderId: string, headers: RequestHeaders) => Promise<string>
}

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("Vendor - adding items to an order stays in the order's store", () => {
      let container: MedusaContainer
      let storeHeaders: RequestHeaders
      let regionId: string
      let salesChannelId: string
      let sellerA: Seed
      let sellerB: Seed

      const ROUTES: AddItemsRoute[] = [
        {
          name: "order edit",
          begin: async (orderId, headers) => {
            await api.post(`/vendor/order-edits`, { order_id: orderId }, headers)
            return `/vendor/order-edits/${orderId}/items`
          },
        },
        {
          name: "claim outbound",
          begin: async (orderId, headers) => {
            const claim = (
              await api.post(
                `/vendor/claims`,
                { type: "replace", order_id: orderId },
                headers
              )
            ).data.claim
            return `/vendor/claims/${claim.id}/outbound/items`
          },
        },
        {
          name: "exchange outbound",
          begin: async (orderId, headers) => {
            const exchange = (
              await api.post(`/vendor/exchanges`, { order_id: orderId }, headers)
            ).data.exchange
            return `/vendor/exchanges/${exchange.id}/outbound/items`
          },
        },
      ]

      const placeOrder = async (variantId: string): Promise<string> => {
        const order = await completeSplitOrderCheckout({
          container,
          api,
          storeHeaders,
          regionId,
          salesChannelId,
          email: BUYER_EMAIL,
          variantId,
        })
        return order.id
      }

      beforeAll(() => {
        container = getContainer()
      })

      beforeEach(async () => {
        const customer = await createCustomerUser(container, {
          email: BUYER_EMAIL,
          first_name: "Add",
          last_name: "Items",
        })
        const publishableKey = await generatePublishableKey(container)
        storeHeaders = {
          headers: {
            ...generateStoreHeaders({ publishableKey }).headers,
            ...customer.headers.headers,
          },
        }

        const salesChannel = await container
          .resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)
          .createSalesChannels({ name: "Add Items Channel" })
        salesChannelId = salesChannel.id

        const region = await container
          .resolve<IRegionModuleService>(Modules.REGION)
          .createRegions({
            name: "Add Items Region",
            currency_code: "usd",
            countries: ["us"],
          })
        regionId = region.id

        await container.resolve(ContainerRegistrationKeys.LINK).create({
          [Modules.REGION]: { region_id: region.id },
          [Modules.PAYMENT]: { payment_provider_id: "pp_system_default" },
        })

        sellerA = await seedSellerProductWithShipping({
          container,
          api,
          salesChannelId,
          email: "add-items-a@test.com",
          name: "AddItemsA",
          stocked: 20,
          price: 2500,
        })
        sellerB = await seedSellerProductWithShipping({
          container,
          api,
          salesChannelId,
          email: "add-items-b@test.com",
          name: "AddItemsB",
          stocked: 20,
          price: 4000,
        })
      })

      it.each(ROUTES.map((route) => [route.name, route] as const))(
        "%s: another store's variant answers 404 and leaves its stock alone",
        async (_name, route) => {
          const orderId = await placeOrder(sellerA.variantId)
          const path = await route.begin(orderId, sellerA.headers)

          const response = await api
            .post(
              path,
              { items: [{ variant_id: sellerB.variantId, quantity: 1 }] },
              sellerA.headers
            )
            .catch((e) => e.response)

          expect(response.status).toEqual(404)

          const order = (
            await api.get(`/vendor/orders/${orderId}?fields=id,*items`, sellerA.headers)
          ).data.order
          const variantIds = order.items.map(
            (item: { variant_id: string }) => item.variant_id
          )
          expect(variantIds).toEqual([sellerA.variantId])
        }
      )

      it.each(ROUTES.map((route) => [route.name, route] as const))(
        "%s: the store's own variant is accepted",
        async (_name, route) => {
          const orderId = await placeOrder(sellerA.variantId)
          const path = await route.begin(orderId, sellerA.headers)

          const response = await api.post(
            path,
            { items: [{ variant_id: sellerA.variantId, quantity: 1 }] },
            sellerA.headers
          )

          expect(response.status).toEqual(200)
          const added = response.data.order_preview.items.filter(
            (item: { variant_id: string; actions?: { action: string }[] }) =>
              item.variant_id === sellerA.variantId &&
              (item.actions ?? []).some((a) => a.action === "ITEM_ADD")
          )
          expect(added).toHaveLength(1)
        }
      )

      it("rejects a mixed batch without adding the own variant", async () => {
        const orderId = await placeOrder(sellerA.variantId)
        await api.post(`/vendor/order-edits`, { order_id: orderId }, sellerA.headers)

        const response = await api
          .post(
            `/vendor/order-edits/${orderId}/items`,
            {
              items: [
                { variant_id: sellerA.variantId, quantity: 1 },
                { variant_id: sellerB.variantId, quantity: 1 },
              ],
            },
            sellerA.headers
          )
          .catch((e) => e.response)

        expect(response.status).toEqual(404)

        const preview = (
          await api.post(
            `/vendor/order-edits/${orderId}/items`,
            { items: [{ variant_id: sellerA.variantId, quantity: 1 }] },
            sellerA.headers
          )
        ).data.order_preview
        const added = preview.items.filter(
          (item: { actions?: { action: string }[] }) =>
            (item.actions ?? []).some((a) => a.action === "ITEM_ADD")
        )
        expect(added).toHaveLength(1)
      })
    })
  },
})
