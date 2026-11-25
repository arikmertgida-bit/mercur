import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework/types"

import { createSellerUser } from "../../../helpers/create-seller-user"
import { createShippingProfile } from "../../../helpers/create-shipping-profile"

jest.setTimeout(120000)

type Headers = { headers: Record<string, string> }

/**
 * A seller product always ships with one of the seller's own shipping
 * profiles and its variants are always stock-tracked — through the JSON API
 * and through the CSV import alike.
 */
medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("Vendor - product store rules", () => {
      let container: MedusaContainer
      let headers: Headers
      let sellerId: string
      let profileId: string
      let counter = 0

      beforeAll(() => {
        container = getContainer()
      })

      beforeEach(async () => {
        counter += 1
        const seller = await createSellerUser(container, {
          email: `store-rules${counter}@kayi.test`,
          name: `Store Rules ${counter}`,
          autoApprove: true,
        })
        headers = seller.headers
        sellerId = seller.seller.id
        profileId = (
          await createShippingProfile(
            container,
            { name: `Profil ${counter}` },
            { seller_id: sellerId }
          )
        ).id
      })

      const errorOf = async (request: Promise<unknown>) => {
        const error = await request.catch((e) => e)
        return {
          status: error.response?.status,
          code: error.response?.data?.code,
        }
      }

      const importCsv = (csv: string) => {
        const form = new FormData()
        form.append("file", new Blob([csv], { type: "text/csv" }), "urunler.csv")
        return api.post(`/vendor/products/import`, form, headers)
      }

      it("rejects a product without a shipping profile", async () => {
        const result = await errorOf(
          api.post(
            `/vendor/products`,
            { title: "Profilsiz", variants: [{ title: "Default" }] },
            headers
          )
        )
        expect(result.status).toEqual(400)
      })

      it("rejects removing the shipping profile", async () => {
        const product = (
          await api.post(
            `/vendor/products`,
            {
              title: "Profilli",
              shipping_profile_id: profileId,
              variants: [{ title: "Default" }],
            },
            headers
          )
        ).data.product
        const result = await errorOf(
          api.post(
            `/vendor/products/${product.id}`,
            { shipping_profile_id: null },
            headers
          )
        )
        expect(result.status).toEqual(400)
      })

      it("rejects a CSV row without a shipping profile", async () => {
        const result = await errorOf(
          importCsv(
            [
              "Product Handle,Product Title,Variant Title,Variant Price USD",
              `csv-profilsiz-${counter},CSV Profilsiz,Default,10`,
            ].join("\n")
          )
        )
        expect(result.status).toEqual(400)
        expect(result.code).toEqual("product_shipping_profile_required")
      })

      it("imports stock-tracked variants owned by the seller", async () => {
        const handle = `csv-ceket-${counter}`
        const res = await importCsv(
          [
            "Product Handle,Product Title,Shipping Profile Id,Variant Title,Variant Manage Inventory,Variant Price USD",
            `${handle},CSV Ceket,${profileId},Default,FALSE,10`,
          ].join("\n")
        )
        expect(res.status).toEqual(200)
        expect(res.data.summary.created).toEqual(1)

        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const {
          data: [product],
        } = await query.graph({
          entity: "product",
          fields: [
            "shipping_profile.id",
            "variants.manage_inventory",
            "variants.inventory_items.inventory_item_id",
          ],
          filters: { handle },
        })
        expect(product.shipping_profile?.id).toEqual(profileId)
        expect(product.variants.map((v) => v?.manage_inventory)).toEqual([true])

        const itemId = product.variants[0]?.inventory_items?.[0]?.inventory_item_id
        const { data: owners } = await query.graph({
          entity: "inventory_item_seller",
          fields: ["seller_id"],
          filters: { inventory_item_id: itemId ? [itemId] : [] },
        })
        expect(owners.map((row) => row.seller_id)).toEqual([sellerId])
      })
    })
  },
})
