import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ISalesChannelModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { adminHeaders, createAdminUser } from "../../../helpers/create-admin-user"
import { seedSellerProductWithShipping } from "../../../helpers/split-order-checkout"

jest.setTimeout(120000)

type Seed = Awaited<ReturnType<typeof seedSellerProductWithShipping>>

const STOCK_LOCATION_CODE = "product_stock_location_not_seller"
const INVENTORY_ITEM_CODE = "product_inventory_item_not_seller"

// An inventory item belongs to its product's store and is stocked only in that
// store's own locations; Medusa's native admin inventory routes must not pair
// one store's item with another store's location or variant.
medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api, dbConnection }) => {
    describe("Admin - inventory items stay in their store", () => {
      let appContainer: MedusaContainer
      let storeA: Seed
      let storeB: Seed
      let itemA: string
      let itemB: string
      let secondLocationA: string

      const inventoryItemOf = async (variantId: string): Promise<string> => {
        const query = appContainer.resolve(ContainerRegistrationKeys.QUERY)
        const { data } = await query.graph({
          entity: "product_variant",
          fields: ["inventory_items.inventory_item_id"],
          filters: { id: variantId },
        })
        return data[0].inventory_items[0].inventory_item_id
      }

      const fail = (request: Promise<{ status: number }>) =>
        request.then(
          () => {
            throw new Error("expected the request to fail")
          },
          (e) => e.response
        )

      beforeAll(() => {
        appContainer = getContainer()
      })

      beforeEach(async () => {
        await createAdminUser(dbConnection, adminHeaders, appContainer)
        const salesChannel = await appContainer
          .resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)
          .createSalesChannels({ name: "Default Store" })

        storeA = await seedSellerProductWithShipping({
          container: appContainer,
          api,
          salesChannelId: salesChannel.id,
          email: "stock-a@test.com",
          name: "StockA",
          stocked: 5,
          price: 1000,
        })
        storeB = await seedSellerProductWithShipping({
          container: appContainer,
          api,
          salesChannelId: salesChannel.id,
          email: "stock-b@test.com",
          name: "StockB",
          stocked: 5,
          price: 1000,
        })
        itemA = await inventoryItemOf(storeA.variantId)
        itemB = await inventoryItemOf(storeB.variantId)
        secondLocationA = (
          await api.post(
            `/vendor/stock-locations`,
            { name: "Second warehouse A" },
            storeA.headers
          )
        ).data.stock_location.id
      })

      describe("POST /admin/inventory-items/:id/location-levels", () => {
        it("rejects another store's location", async () => {
          const res = await fail(
            api.post(
              `/admin/inventory-items/${itemA}/location-levels`,
              { location_id: storeB.stockLocationId, stocked_quantity: 3 },
              adminHeaders
            )
          )
          expect(res.status).toEqual(400)
          expect(res.data.code).toEqual(STOCK_LOCATION_CODE)
        })

        it("accepts a location of the item's own store", async () => {
          const res = await api.post(
            `/admin/inventory-items/${itemA}/location-levels`,
            { location_id: secondLocationA, stocked_quantity: 3 },
            adminHeaders
          )
          expect(res.status).toEqual(200)
        })
      })

      describe("POST /admin/inventory-items/:id/location-levels/batch", () => {
        it("rejects creating a level in another store's location", async () => {
          const res = await fail(
            api.post(
              `/admin/inventory-items/${itemA}/location-levels/batch`,
              { create: [{ location_id: storeB.stockLocationId }] },
              adminHeaders
            )
          )
          expect(res.status).toEqual(400)
          expect(res.data.code).toEqual(STOCK_LOCATION_CODE)
        })

        it("updates a level in the item's own location", async () => {
          const res = await api.post(
            `/admin/inventory-items/${itemA}/location-levels/batch`,
            {
              update: [
                { location_id: storeA.stockLocationId, stocked_quantity: 9 },
              ],
            },
            adminHeaders
          )
          expect(res.status).toEqual(200)
        })
      })

      describe("POST /admin/inventory-items/location-levels/batch", () => {
        it("rejects pairing an item with another store's location", async () => {
          const res = await fail(
            api.post(
              `/admin/inventory-items/location-levels/batch`,
              {
                create: [
                  {
                    inventory_item_id: itemA,
                    location_id: storeB.stockLocationId,
                    stocked_quantity: 1,
                  },
                ],
              },
              adminHeaders
            )
          )
          expect(res.status).toEqual(400)
          expect(res.data.code).toEqual(STOCK_LOCATION_CODE)
        })
      })

      describe("POST /admin/inventory-items", () => {
        it("does not stock a new store-less item in a store's location", async () => {
          const res = await fail(
            api.post(
              `/admin/inventory-items`,
              {
                sku: "STORELESS-1",
                location_levels: [{ location_id: storeA.stockLocationId }],
              },
              adminHeaders
            )
          )
          expect(res.status).toEqual(400)
          expect(res.data.code).toEqual(STOCK_LOCATION_CODE)
        })
      })

      describe("variant inventory items", () => {
        it("rejects linking another store's item through the batch route", async () => {
          const res = await fail(
            api.post(
              `/admin/products/${storeA.product.id}/variants/inventory-items/batch`,
              {
                create: [
                  {
                    variant_id: storeA.variantId,
                    inventory_item_id: itemB,
                    required_quantity: 1,
                  },
                ],
              },
              adminHeaders
            )
          )
          expect(res.status).toEqual(400)
          expect(res.data.code).toEqual(INVENTORY_ITEM_CODE)
        })

        it("rejects linking another store's item to one variant", async () => {
          const res = await fail(
            api.post(
              `/admin/products/${storeA.product.id}/variants/${storeA.variantId}/inventory-items`,
              { inventory_item_id: itemB, required_quantity: 1 },
              adminHeaders
            )
          )
          expect(res.status).toEqual(400)
          expect(res.data.code).toEqual(INVENTORY_ITEM_CODE)

          const query = appContainer.resolve(ContainerRegistrationKeys.QUERY)
          const { data } = await query.graph({
            entity: "product_variant",
            fields: ["inventory_items.inventory_item_id"],
            filters: { id: storeA.variantId },
          })
          expect(
            data[0].inventory_items.map(
              (link: { inventory_item_id: string }) => link.inventory_item_id
            )
          ).toEqual([itemA])
        })
      })
    })
  },
})
