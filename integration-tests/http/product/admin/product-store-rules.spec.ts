import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework/types"

import {
  adminHeaders,
  createAdminUser,
} from "../../../helpers/create-admin-user"
import { createSellerUser } from "../../../helpers/create-seller-user"
import { createShippingProfile } from "../../../helpers/create-shipping-profile"

jest.setTimeout(120000)

type SellerFixture = {
  id: string
  locationId: string
  profileId: string
}

/**
 * Medusa's native admin product routes that Kayı does not otherwise replace
 * must keep the one-store rule: variants added in a batch are stock-tracked
 * and their inventory items belong to the product's store, every product has
 * a shipping profile, and the admin CSV import (which creates store-less
 * products) is closed.
 */
medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api, dbConnection }) => {
    describe("Admin - native product routes keep the store rules", () => {
      let container: MedusaContainer
      let sellerA: SellerFixture
      let sellerB: SellerFixture
      let productId: string
      let counter = 0

      beforeAll(() => {
        container = getContainer()
      })

      const seedSeller = async (email: string): Promise<SellerFixture> => {
        const { seller, headers } = await createSellerUser(container, {
          email,
          name: email,
          autoApprove: true,
        })
        const location = (
          await api.post(
            `/vendor/stock-locations`,
            { name: `Depo ${email}` },
            headers
          )
        ).data.stock_location
        const profile = await createShippingProfile(
          container,
          { name: `Profil ${email}` },
          { seller_id: seller.id }
        )
        return { id: seller.id, locationId: location.id, profileId: profile.id }
      }

      const errorOf = async (request: Promise<unknown>) => {
        const error = await request.catch((e) => e)
        return {
          status: error.response?.status,
          code: error.response?.data?.code,
        }
      }

      const createPayload = (overrides: Record<string, unknown> = {}) => ({
        title: `Urun ${counter}`,
        seller_ids: [sellerA.id],
        shipping_profile_id: sellerA.profileId,
        variants: [
          {
            title: "Default",
            prices: [{ amount: 100, currency_code: "usd" }],
            inventory: [{ location_id: sellerA.locationId, quantity: 3 }],
          },
        ],
        ...overrides,
      })

      const itemOf = async (variantId: string) => {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const {
          data: [variant],
        } = await query.graph({
          entity: "product_variant",
          fields: ["manage_inventory", "inventory_items.inventory_item_id"],
          filters: { id: variantId },
        })
        const itemId = variant.inventory_items?.[0]?.inventory_item_id
        const { data: owners } = await query.graph({
          entity: "inventory_item_seller",
          fields: ["seller_id"],
          filters: { inventory_item_id: itemId ? [itemId] : [] },
        })
        return {
          manageInventory: variant.manage_inventory,
          itemId,
          sellerIds: owners.map((row) => row.seller_id),
        }
      }

      beforeEach(async () => {
        await createAdminUser(dbConnection, adminHeaders, container)
        counter += 1
        sellerA = await seedSeller(`rules-a${counter}@kayi.test`)
        sellerB = await seedSeller(`rules-b${counter}@kayi.test`)
        productId = (
          await api.post(`/admin/products`, createPayload(), adminHeaders)
        ).data.product.id
      })

      describe("POST /admin/products/:id/variants/batch", () => {
        it("creates stock-tracked variants owned by the product's store", async () => {
          const res = await api.post(
            `/admin/products/${productId}/variants/batch`,
            {
              create: [
                {
                  title: "Mavi",
                  prices: [{ amount: 120, currency_code: "usd" }],
                  inventory: [{ location_id: sellerA.locationId, quantity: 4 }],
                },
              ],
            },
            adminHeaders
          )
          expect(res.status).toEqual(200)
          expect(res.data.created).toHaveLength(1)

          const item = await itemOf(res.data.created[0].id)
          expect(item.manageInventory).toEqual(true)
          expect(item.itemId).toBeTruthy()
          expect(item.sellerIds).toEqual([sellerA.id])
        })

        it("rejects an untracked variant", async () => {
          const result = await errorOf(
            api.post(
              `/admin/products/${productId}/variants/batch`,
              {
                create: [
                  {
                    title: "Takipsiz",
                    manage_inventory: false,
                    prices: [{ amount: 120, currency_code: "usd" }],
                  },
                ],
              },
              adminHeaders
            )
          )
          expect(result.status).toEqual(400)
        })

        it("rejects another store's inventory item", async () => {
          const other = (
            await api.post(
              `/admin/products`,
              createPayload({
                title: `Diger magaza urunu ${counter}`,
                seller_ids: [sellerB.id],
                shipping_profile_id: sellerB.profileId,
                variants: [
                  {
                    title: "Default",
                    prices: [{ amount: 100, currency_code: "usd" }],
                    inventory: [{ location_id: sellerB.locationId, quantity: 1 }],
                  },
                ],
              }),
              adminHeaders
            )
          ).data.product
          const otherItem = await itemOf(other.variants[0].id)

          const result = await errorOf(
            api.post(
              `/admin/products/${productId}/variants/batch`,
              {
                create: [
                  {
                    title: "Yabanci",
                    prices: [{ amount: 120, currency_code: "usd" }],
                    inventory_items: [
                      { inventory_item_id: otherItem.itemId, required_quantity: 1 },
                    ],
                  },
                ],
              },
              adminHeaders
            )
          )
          expect(result.status).toEqual(400)
        })

        it("rejects another store's stock location", async () => {
          const result = await errorOf(
            api.post(
              `/admin/products/${productId}/variants/batch`,
              {
                create: [
                  {
                    title: "Yabanci depo",
                    prices: [{ amount: 120, currency_code: "usd" }],
                    inventory: [{ location_id: sellerB.locationId, quantity: 2 }],
                  },
                ],
              },
              adminHeaders
            )
          )
          expect(result.status).toEqual(400)
          expect(result.code).toEqual("product_stock_location_not_seller")
        })

        it("rejects turning stock tracking off", async () => {
          const product = (
            await api.get(`/admin/products/${productId}`, adminHeaders)
          ).data.product
          const result = await errorOf(
            api.post(
              `/admin/products/${productId}/variants/batch`,
              {
                update: [
                  { id: product.variants[0].id, manage_inventory: false },
                ],
              },
              adminHeaders
            )
          )
          expect(result.status).toEqual(400)
          expect((await itemOf(product.variants[0].id)).manageInventory).toEqual(
            true
          )
        })

        it("updates and deletes variants", async () => {
          const created = (
            await api.post(
              `/admin/products/${productId}/variants/batch`,
              {
                create: [
                  {
                    title: "Silinecek",
                    prices: [{ amount: 50, currency_code: "usd" }],
                  },
                ],
              },
              adminHeaders
            )
          ).data.created[0]
          const product = (
            await api.get(`/admin/products/${productId}`, adminHeaders)
          ).data.product
          const keep = product.variants.find(
            (variant: { id: string }) => variant.id !== created.id
          )

          const res = await api.post(
            `/admin/products/${productId}/variants/batch`,
            {
              update: [{ id: keep.id, title: "Yeni ad" }],
              delete: [created.id],
            },
            adminHeaders
          )
          expect(res.status).toEqual(200)
          expect(res.data.updated[0]).toEqual(
            expect.objectContaining({ id: keep.id, title: "Yeni ad" })
          )
          expect(res.data.deleted).toEqual(
            expect.objectContaining({ ids: [created.id], deleted: true })
          )
        })
      })

      describe("shipping profile is required", () => {
        it("rejects creating a product without one", async () => {
          const payload = createPayload()
          delete (payload as { shipping_profile_id?: string })
            .shipping_profile_id
          const result = await errorOf(
            api.post(`/admin/products`, payload, adminHeaders)
          )
          expect(result.status).toEqual(400)
        })

        it("rejects removing it", async () => {
          const single = await errorOf(
            api.post(
              `/admin/products/${productId}`,
              { shipping_profile_id: null },
              adminHeaders
            )
          )
          expect(single.status).toEqual(400)

          const batch = await errorOf(
            api.post(
              `/admin/products/batch`,
              { update: [{ id: productId, shipping_profile_id: null }] },
              adminHeaders
            )
          )
          expect(batch.status).toEqual(400)
        })
      })

      describe("admin CSV import is closed", () => {
        it.each([
          "/admin/products/import",
          "/admin/products/imports",
          "/admin/products/import/tx_1/confirm",
          "/admin/products/imports/tx_1/confirm",
        ])("POST %s answers 404", async (path) => {
          const result = await errorOf(api.post(path, {}, adminHeaders))
          expect(result.status).toEqual(404)
        })
      })
    })
  },
})
