import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework/types"
import { MercurModules } from "@mercurjs/types"

import {
  adminHeaders,
  createAdminUser,
} from "../../../helpers/create-admin-user"
import { createSellerUser } from "../../../helpers/create-seller-user"
import { createShippingProfile } from "../../../helpers/create-shipping-profile"

jest.setTimeout(120000)

type SellerFixture = {
  id: string
  headers: { headers: Record<string, string> }
  locationId: string
  profileId: string
}

/**
 * A product belongs to exactly one seller. The admin creates it for one
 * seller with that seller's shipping profile and stock locations, and can
 * move it to another seller only through POST /admin/products/:id/seller:
 * the new seller's profile is required, the old seller's stock levels are
 * deleted, the inventory items follow the product, and the move is refused
 * while stock is reserved or the old seller's promotions / price lists still
 * name the product.
 */
medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api, dbConnection }) => {
    describe("Admin - product seller", () => {
      let container: MedusaContainer
      let sellerA: SellerFixture
      let sellerB: SellerFixture
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
        return {
          id: seller.id,
          headers,
          locationId: location.id,
          profileId: profile.id,
        }
      }

      beforeEach(async () => {
        await createAdminUser(dbConnection, adminHeaders, container)
        counter += 1
        sellerA = await seedSeller(`a${counter}@kayi.test`)
        sellerB = await seedSeller(`b${counter}@kayi.test`)
      })

      const createPayload = (overrides: Record<string, unknown> = {}) => ({
        title: `Urun ${counter}`,
        seller_ids: [sellerA.id],
        shipping_profile_id: sellerA.profileId,
        variants: [
          {
            title: "Default",
            sku: `SKU-${counter}`,
            prices: [{ amount: 100, currency_code: "usd" }],
            inventory: [{ location_id: sellerA.locationId, quantity: 7 }],
          },
        ],
        ...overrides,
      })

      const createProduct = async () =>
        (await api.post(`/admin/products`, createPayload(), adminHeaders)).data
          .product

      const errorOf = async (request: Promise<unknown>) => {
        const error = await request.catch((e) => e)
        return {
          status: error.response?.status,
          code: error.response?.data?.code,
          message: error.response?.data?.message,
        }
      }

      const productState = async (productId: string) => {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const {
          data: [product],
        } = await query.graph({
          entity: "product",
          fields: [
            "id",
            "sellers.id",
            "shipping_profile.id",
            "variants.id",
            "variants.manage_inventory",
            "variants.price_set.id",
            "variants.inventory_items.inventory_item_id",
          ],
          filters: { id: productId },
        })
        const inventoryItemIds = (product.variants ?? []).flatMap((v) =>
          (v?.inventory_items ?? []).map((i) => i?.inventory_item_id)
        ) as string[]
        const { data: itemSellers } = await query.graph({
          entity: "inventory_item_seller",
          fields: ["inventory_item_id", "seller_id"],
          filters: { inventory_item_id: inventoryItemIds },
        })
        const inventoryModule = container.resolve(Modules.INVENTORY)
        const levels = await inventoryModule.listInventoryLevels({
          inventory_item_id: inventoryItemIds,
        })
        return {
          sellerIds: (product.sellers ?? []).map((s) => s?.id),
          shippingProfileId: product.shipping_profile?.id,
          manageInventory: (product.variants ?? []).map(
            (v) => v?.manage_inventory
          ),
          priceSetIds: (product.variants ?? []).map((v) => v?.price_set?.id),
          inventoryItemIds,
          itemSellerIds: itemSellers.map((row) => row.seller_id),
          levels,
        }
      }

      describe("POST /admin/products", () => {
        it("requires exactly one seller", async () => {
          const none = await errorOf(
            api.post(
              `/admin/products`,
              createPayload({ seller_ids: [] }),
              adminHeaders
            )
          )
          expect(none.status).toEqual(400)
          expect(none.code).toEqual("product_seller_required")

          const omitted = createPayload()
          delete (omitted as { seller_ids?: string[] }).seller_ids
          const missing = await errorOf(
            api.post(`/admin/products`, omitted, adminHeaders)
          )
          expect(missing.status).toEqual(400)
          expect(missing.code).toEqual("product_seller_required")

          const two = await errorOf(
            api.post(
              `/admin/products`,
              createPayload({ seller_ids: [sellerA.id, sellerB.id] }),
              adminHeaders
            )
          )
          expect(two.status).toEqual(400)
          expect(two.code).toEqual("product_seller_required")
        })

        it("rejects another seller's shipping profile", async () => {
          const result = await errorOf(
            api.post(
              `/admin/products`,
              createPayload({ shipping_profile_id: sellerB.profileId }),
              adminHeaders
            )
          )
          expect(result.status).toEqual(400)
          expect(result.code).toEqual("product_shipping_profile_not_seller")
        })

        it("rejects another seller's stock location", async () => {
          const result = await errorOf(
            api.post(
              `/admin/products`,
              createPayload({
                variants: [
                  {
                    title: "Default",
                    prices: [{ amount: 100, currency_code: "usd" }],
                    inventory: [
                      { location_id: sellerB.locationId, quantity: 1 },
                    ],
                  },
                ],
              }),
              adminHeaders
            )
          )
          expect(result.status).toEqual(400)
          expect(result.code).toEqual("product_stock_location_not_seller")
        })

        it("creates a stock-tracked product owned by the seller", async () => {
          const product = await createProduct()
          const state = await productState(product.id)

          expect(state.sellerIds).toEqual([sellerA.id])
          expect(state.shippingProfileId).toEqual(sellerA.profileId)
          expect(state.manageInventory).toEqual([true])
          expect(state.itemSellerIds).toEqual([sellerA.id])
          expect(state.levels).toEqual([
            expect.objectContaining({
              location_id: sellerA.locationId,
              stocked_quantity: 7,
            }),
          ])
        })
      })

      describe("product edits keep the seller's own resources", () => {
        it("rejects another seller's shipping profile on update", async () => {
          const product = await createProduct()
          const result = await errorOf(
            api.post(
              `/admin/products/${product.id}`,
              { shipping_profile_id: sellerB.profileId },
              adminHeaders
            )
          )
          expect(result.status).toEqual(400)
          expect(result.code).toEqual("product_shipping_profile_not_seller")
        })

        it("adds a variant whose stock belongs to the product's seller", async () => {
          const product = await createProduct()

          const foreign = await errorOf(
            api.post(
              `/admin/products/${product.id}/variants`,
              {
                title: "Second",
                prices: [{ amount: 50, currency_code: "usd" }],
                inventory: [{ location_id: sellerB.locationId, quantity: 1 }],
              },
              adminHeaders
            )
          )
          expect(foreign.status).toEqual(400)
          expect(foreign.code).toEqual("product_stock_location_not_seller")

          await api.post(
            `/admin/products/${product.id}/variants`,
            {
              title: "Second",
              sku: `SKU2-${counter}`,
              prices: [{ amount: 50, currency_code: "usd" }],
              inventory: [{ location_id: sellerA.locationId, quantity: 3 }],
            },
            adminHeaders
          )

          const state = await productState(product.id)
          expect(state.manageInventory).toEqual([true, true])
          expect(state.itemSellerIds).toEqual([sellerA.id, sellerA.id])
          expect(
            state.levels.map((l) => [l.location_id, l.stocked_quantity]).sort()
          ).toEqual(
            [
              [sellerA.locationId, 3],
              [sellerA.locationId, 7],
            ].sort()
          )
        })
      })

      describe("POST /admin/products/:id/seller", () => {
        const move = (productId: string, body: Record<string, unknown>) =>
          api.post(`/admin/products/${productId}/seller`, body, adminHeaders)

        it("moves the product, its stock items and its shipping profile", async () => {
          const product = await createProduct()

          const res = await move(product.id, {
            seller_id: sellerB.id,
            shipping_profile_id: sellerB.profileId,
          })
          expect(res.status).toEqual(200)

          const state = await productState(product.id)
          expect(state.sellerIds).toEqual([sellerB.id])
          expect(state.shippingProfileId).toEqual(sellerB.profileId)
          expect(state.itemSellerIds).toEqual([sellerB.id])
          expect(state.levels).toEqual([])

          const oldOwner = await errorOf(
            api.get(`/vendor/products/${product.id}`, sellerA.headers)
          )
          expect(oldOwner.status).toEqual(404)
          const newOwner = await api.get(
            `/vendor/products/${product.id}`,
            sellerB.headers
          )
          expect(newOwner.status).toEqual(200)
        })

        it("requires the new seller's own shipping profile", async () => {
          const product = await createProduct()

          const missing = await errorOf(move(product.id, { seller_id: sellerB.id }))
          expect(missing.status).toEqual(400)

          const foreign = await errorOf(
            move(product.id, {
              seller_id: sellerB.id,
              shipping_profile_id: sellerA.profileId,
            })
          )
          expect(foreign.status).toEqual(400)
          expect(foreign.code).toEqual("product_shipping_profile_not_seller")

          expect((await productState(product.id)).sellerIds).toEqual([
            sellerA.id,
          ])
        })

        it("rejects a move to the current seller and an unknown seller", async () => {
          const product = await createProduct()

          const same = await errorOf(
            move(product.id, {
              seller_id: sellerA.id,
              shipping_profile_id: sellerA.profileId,
            })
          )
          expect(same.status).toEqual(400)
          expect(same.code).toEqual("product_seller_unchanged")

          const unknown = await errorOf(
            move(product.id, {
              seller_id: "sel_missing",
              shipping_profile_id: sellerB.profileId,
            })
          )
          expect(unknown.status).toEqual(404)
        })

        it("refuses while stock is reserved", async () => {
          const product = await createProduct()
          const state = await productState(product.id)
          const inventoryModule = container.resolve(Modules.INVENTORY)
          await inventoryModule.createReservationItems([
            {
              inventory_item_id: state.inventoryItemIds[0],
              location_id: sellerA.locationId,
              quantity: 1,
            },
          ])

          const result = await errorOf(
            move(product.id, {
              seller_id: sellerB.id,
              shipping_profile_id: sellerB.profileId,
            })
          )
          expect(result.status).toEqual(400)
          expect(result.code).toEqual("product_move_reserved_stock")

          const after = await productState(product.id)
          expect(after.sellerIds).toEqual([sellerA.id])
          expect(after.levels).toHaveLength(1)
        })

        it("refuses while the old seller's promotion names the product", async () => {
          const product = await createProduct()
          const promotionModule = container.resolve(Modules.PROMOTION)
          const [promotion] = await promotionModule.createPromotions([
            {
              code: `TASIMA${counter}`,
              type: "standard",
              status: "active",
              application_method: {
                type: "percentage",
                target_type: "items",
                allocation: "each",
                max_quantity: 1,
                value: 10,
                target_rules: [
                  {
                    attribute: "items.product.id",
                    operator: "in",
                    values: [product.id],
                  },
                ],
              },
            },
          ])
          const link = container.resolve(ContainerRegistrationKeys.LINK)
          await link.create({
            [Modules.PROMOTION]: { promotion_id: promotion.id },
            [MercurModules.SELLER]: { seller_id: sellerA.id },
          })

          const result = await errorOf(
            move(product.id, {
              seller_id: sellerB.id,
              shipping_profile_id: sellerB.profileId,
            })
          )
          expect(result.status).toEqual(400)
          expect(result.code).toEqual("product_move_seller_promotions")
          expect(result.message).toContain(`TASIMA${counter}`)
          expect((await productState(product.id)).sellerIds).toEqual([
            sellerA.id,
          ])
        })

        it("refuses while the old seller's price list prices the product", async () => {
          const product = await createProduct()
          const state = await productState(product.id)
          const pricingModule = container.resolve(Modules.PRICING)
          const [priceList] = await pricingModule.createPriceLists([
            {
              title: `Toptan ${counter}`,
              description: "Toptan",
              prices: [
                {
                  amount: 80,
                  currency_code: "usd",
                  price_set_id: state.priceSetIds[0] as string,
                },
              ],
            },
          ])
          const link = container.resolve(ContainerRegistrationKeys.LINK)
          await link.create({
            [Modules.PRICING]: { price_list_id: priceList.id },
            [MercurModules.SELLER]: { seller_id: sellerA.id },
          })

          const result = await errorOf(
            move(product.id, {
              seller_id: sellerB.id,
              shipping_profile_id: sellerB.profileId,
            })
          )
          expect(result.status).toEqual(400)
          expect(result.code).toEqual("product_move_seller_price_lists")
          expect(result.message).toContain(`Toptan ${counter}`)
        })

        it("no longer offers the multi-seller batch link route", async () => {
          const product = await createProduct()
          const result = await errorOf(
            api.post(
              `/admin/products/${product.id}/sellers`,
              { add: [sellerB.id] },
              adminHeaders
            )
          )
          expect(result.status).toEqual(404)
          expect((await productState(product.id)).sellerIds).toEqual([
            sellerA.id,
          ])
        })
      })

      describe("GET /admin/shipping-profiles", () => {
        it("filters by seller", async () => {
          const res = await api.get(
            `/admin/shipping-profiles?seller_id=${sellerB.id}`,
            adminHeaders
          )
          expect(
            res.data.shipping_profiles.map((p: { id: string }) => p.id)
          ).toEqual([sellerB.profileId])
        })
      })
    })
  },
})
