import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  IRegionModuleService,
  ISalesChannelModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { createCustomerUser } from "../../../helpers/create-customer-user"
import {
  adminHeaders,
  createAdminUser,
  generatePublishableKey,
  generateStoreHeaders,
} from "../../../helpers/create-admin-user"
import {
  completeSplitOrderCheckout,
  seedSellerProductWithShipping,
} from "../../../helpers/split-order-checkout"

jest.setTimeout(180000)

type RequestHeaders = { headers: Record<string, string> }

const BUYER_EMAIL = "admin-add-items-buyer@test.com"
const VARIANT_NOT_SELLER_CODE = "order_variant_not_seller"

type AddItemsRoute = {
  name: string
  begin: (orderId: string) => Promise<string>
}

// Every order belongs to one store; the admin may add items to it, but only
// that store's variants — otherwise the order would draw another store's stock
// and the money would go to the wrong seller.
medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api, dbConnection }) => {
    describe("Admin - adding items to an order stays in the order's store", () => {
      let container: MedusaContainer
      let storeHeaders: RequestHeaders
      let regionId: string
      let salesChannelId: string
      let variantA: string
      let variantB: string

      const ROUTES: AddItemsRoute[] = [
        {
          name: "order edit",
          begin: async (orderId) => {
            await api.post(`/admin/order-edits`, { order_id: orderId }, adminHeaders)
            return `/admin/order-edits/${orderId}/items`
          },
        },
        {
          name: "claim outbound",
          begin: async (orderId) => {
            const claim = (
              await api.post(
                `/admin/claims`,
                { type: "replace", order_id: orderId },
                adminHeaders
              )
            ).data.claim
            return `/admin/claims/${claim.id}/outbound/items`
          },
        },
        {
          name: "exchange outbound",
          begin: async (orderId) => {
            const exchange = (
              await api.post(`/admin/exchanges`, { order_id: orderId }, adminHeaders)
            ).data.exchange
            return `/admin/exchanges/${exchange.id}/outbound/items`
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
        await createAdminUser(dbConnection, adminHeaders, container)

        const customer = await createCustomerUser(container, {
          email: BUYER_EMAIL,
          first_name: "Admin",
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
          .createSalesChannels({ name: "Admin Add Items Channel" })
        salesChannelId = salesChannel.id

        const region = await container
          .resolve<IRegionModuleService>(Modules.REGION)
          .createRegions({
            name: "Admin Add Items Region",
            currency_code: "usd",
            countries: ["us"],
          })
        regionId = region.id

        await container.resolve(ContainerRegistrationKeys.LINK).create({
          [Modules.REGION]: { region_id: region.id },
          [Modules.PAYMENT]: { payment_provider_id: "pp_system_default" },
        })

        const storeA = await seedSellerProductWithShipping({
          container,
          api,
          salesChannelId,
          email: "admin-add-items-a@test.com",
          name: "AdminItemsA",
          stocked: 20,
          price: 2500,
        })
        const storeB = await seedSellerProductWithShipping({
          container,
          api,
          salesChannelId,
          email: "admin-add-items-b@test.com",
          name: "AdminItemsB",
          stocked: 20,
          price: 4000,
        })
        variantA = storeA.variantId
        variantB = storeB.variantId
      })

      it.each(ROUTES.map((route) => [route.name, route] as const))(
        "%s: another store's variant is rejected with its own code",
        async (_name, route) => {
          const orderId = await placeOrder(variantA)
          const path = await route.begin(orderId)

          const response = await api
            .post(
              path,
              { items: [{ variant_id: variantB, quantity: 1 }] },
              adminHeaders
            )
            .catch((e) => e.response)

          expect(response.status).toEqual(400)
          expect(response.data.code).toEqual(VARIANT_NOT_SELLER_CODE)
        }
      )

      it.each(ROUTES.map((route) => [route.name, route] as const))(
        "%s: the order's own store variant is accepted",
        async (_name, route) => {
          const orderId = await placeOrder(variantA)
          const path = await route.begin(orderId)

          const response = await api.post(
            path,
            { items: [{ variant_id: variantA, quantity: 1 }] },
            adminHeaders
          )

          expect(response.status).toEqual(200)
          const added = response.data.order_preview.items.filter(
            (item: { variant_id: string; actions?: { action: string }[] }) =>
              item.variant_id === variantA &&
              (item.actions ?? []).some((a) => a.action === "ITEM_ADD")
          )
          expect(added).toHaveLength(1)
        }
      )
    })
  },
})
