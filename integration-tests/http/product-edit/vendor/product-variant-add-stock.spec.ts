import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ProductChangeActionType } from "@mercurjs/types"

import { createSellerUser } from "../../../helpers/create-seller-user"

jest.setTimeout(90_000)

type Headers = { headers: Record<string, string> }

type VariantStockRow = {
  id: string
  title: string
  manage_inventory: boolean
  prices: Array<{ amount: number; currency_code: string }>
  inventory_items: Array<{
    inventory_item_id: string
    inventory: {
      location_levels: Array<{ location_id: string; stocked_quantity: number }>
    }
  }>
}

/**
 * "Add variant" used to stage every new variant with
 * `manage_inventory: false` and no price. Vendors cannot change
 * `manage_inventory` later, so the variant sold without limit as soon as it
 * got a price. A new variant is now always stock-tracked, takes its price and
 * stock in the same request, and only accepts the seller's own stock
 * locations.
 */
medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("Vendor add variant — price and stock", () => {
      let container: MedusaContainer
      let sellerHeaders: Headers
      let otherSellerHeaders: Headers
      let locationId: string
      let otherLocationId: string

      beforeAll(async () => {
        container = getContainer()
      })

      beforeEach(async () => {
        const a = await createSellerUser(container, {
          autoApprove: true,
          email: "variant-stock-seller@test.com",
          name: "Variant Stock Seller",
        })
        sellerHeaders = a.headers
        const b = await createSellerUser(container, {
          autoApprove: true,
          email: "variant-stock-other@test.com",
          name: "Variant Stock Other",
        })
        otherSellerHeaders = b.headers

        locationId = (
          await api.post(
            `/vendor/stock-locations`,
            { name: "Own Warehouse" },
            sellerHeaders,
          )
        ).data.stock_location.id
        otherLocationId = (
          await api.post(
            `/vendor/stock-locations`,
            { name: "Other Warehouse" },
            otherSellerHeaders,
          )
        ).data.stock_location.id
      })

      const createProduct = async (title: string): Promise<string> => {
        const res = await api.post(`/vendor/products`, { title }, sellerHeaders)
        return res.data.product.id
      }

      const loadVariant = async (
        productId: string,
        title: string,
      ): Promise<VariantStockRow | undefined> => {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data } = await query.graph({
          entity: "product_variant",
          fields: [
            "id",
            "title",
            "manage_inventory",
            "prices.amount",
            "prices.currency_code",
            "inventory_items.inventory_item_id",
            "inventory_items.inventory.location_levels.location_id",
            "inventory_items.inventory.location_levels.stocked_quantity",
          ],
          filters: { product_id: productId },
        })
        return (data as VariantStockRow[]).find((v) => v.title === title)
      }

      const listSellerInventoryItemIds = async (
        headers: Headers,
      ): Promise<string[]> => {
        const res = await api.get(
          `/vendor/inventory-items?fields=id&limit=100`,
          headers,
        )
        return (res.data.inventory_items as Array<{ id: string }>).map(
          (item) => item.id,
        )
      }

      it("creates a stock-tracked, priced variant stocked at the seller's location", async () => {
        const productId = await createProduct("Stocked Variant Product")

        const res = await api.post(
          `/vendor/products/${productId}/variants`,
          {
            title: "Red",
            prices: [{ amount: 1500, currency_code: "usd" }],
            inventory: [{ location_id: locationId, quantity: 7 }],
          },
          sellerHeaders,
        )
        expect(res.status).toBe(202)

        const variant = await loadVariant(productId, "Red")
        expect(variant).toBeDefined()
        expect(variant?.manage_inventory).toBe(true)
        expect(variant?.prices).toEqual([
          expect.objectContaining({ amount: 1500, currency_code: "usd" }),
        ])

        const item = variant?.inventory_items[0]
        expect(item).toBeDefined()
        expect(item?.inventory.location_levels).toEqual([
          expect.objectContaining({ location_id: locationId, stocked_quantity: 7 }),
        ])

        const ownItems = await listSellerInventoryItemIds(sellerHeaders)
        expect(ownItems).toContain(item?.inventory_item_id)
        const otherItems = await listSellerInventoryItemIds(otherSellerHeaders)
        expect(otherItems).not.toContain(item?.inventory_item_id)
      })

      it("keeps a variant added without stock tracked, so it never sells without limit", async () => {
        const productId = await createProduct("Unstocked Variant Product")

        await api.post(
          `/vendor/products/${productId}/variants`,
          { title: "Blue", manage_inventory: false },
          sellerHeaders,
        )

        const variant = await loadVariant(productId, "Blue")
        expect(variant?.manage_inventory).toBe(true)
        expect(variant?.inventory_items).toHaveLength(1)
        expect(variant?.inventory_items[0]?.inventory.location_levels).toEqual(
          [],
        )
      })

      it("rejects another seller's stock location and stages nothing", async () => {
        const productId = await createProduct("Foreign Location Product")

        const res = await api
          .post(
            `/vendor/products/${productId}/variants`,
            {
              title: "Green",
              prices: [{ amount: 900, currency_code: "usd" }],
              inventory: [{ location_id: otherLocationId, quantity: 3 }],
            },
            sellerHeaders,
          )
          .catch((e) => e.response)
        expect(res.status).toBe(404)

        expect(await loadVariant(productId, "Green")).toBeUndefined()

        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: actions } = await query.graph({
          entity: "product_change_action",
          fields: ["id"],
          filters: {
            product_id: productId,
            action: ProductChangeActionType.VARIANT_ADD,
          },
        })
        expect(actions).toHaveLength(0)
      })

      it("rejects negative stock and negative prices", async () => {
        const productId = await createProduct("Negative Values Product")

        const stock = await api
          .post(
            `/vendor/products/${productId}/variants`,
            {
              title: "Negative Stock",
              inventory: [{ location_id: locationId, quantity: -1 }],
            },
            sellerHeaders,
          )
          .catch((e) => e.response)
        expect(stock.status).toBe(400)

        const price = await api
          .post(
            `/vendor/products/${productId}/variants`,
            {
              title: "Negative Price",
              prices: [{ amount: -5, currency_code: "usd" }],
            },
            sellerHeaders,
          )
          .catch((e) => e.response)
        expect(price.status).toBe(400)
      })
    })

    describe("Vendor create product — stock locations", () => {
      let container: MedusaContainer
      let sellerHeaders: Headers
      let otherLocationId: string

      beforeAll(async () => {
        container = getContainer()
      })

      beforeEach(async () => {
        sellerHeaders = (
          await createSellerUser(container, {
            autoApprove: true,
            email: "product-stock-seller@test.com",
            name: "Product Stock Seller",
          })
        ).headers
        const other = await createSellerUser(container, {
          autoApprove: true,
          email: "product-stock-other@test.com",
          name: "Product Stock Other",
        })
        otherLocationId = (
          await api.post(
            `/vendor/stock-locations`,
            { name: "Other Seller Warehouse" },
            other.headers,
          )
        ).data.stock_location.id
      })

      it("rejects stock at another seller's location", async () => {
        const res = await api
          .post(
            `/vendor/products`,
            {
              title: "Foreign Stock Product",
              variants: [
                {
                  title: "Default",
                  prices: [{ amount: 1000, currency_code: "usd" }],
                  inventory: [{ location_id: otherLocationId, quantity: 5 }],
                },
              ],
            },
            sellerHeaders,
          )
          .catch((e) => e.response)
        expect(res.status).toBe(404)

        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data } = await query.graph({
          entity: "product",
          fields: ["id"],
          filters: { title: "Foreign Stock Product" },
        })
        expect(data).toHaveLength(0)
      })

      it("tracks stock for a variant created without stock entries", async () => {
        const res = await api.post(
          `/vendor/products`,
          {
            title: "No Stock Entry Product",
            variants: [
              {
                title: "Default",
                prices: [{ amount: 1000, currency_code: "usd" }],
              },
            ],
          },
          sellerHeaders,
        )
        const variant = res.data.product.variants[0]
        expect(variant.manage_inventory).toBe(true)
      })
    })
  },
})
