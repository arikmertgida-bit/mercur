import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ProductChangeActionType } from "@mercurjs/types"

import { createSellerUser } from "../../../helpers/create-seller-user"

jest.setTimeout(60_000)

type VariantRow = {
  id: string
  title: string
  sku: string | null
}

/**
 * Regression coverage for a cross-tenant IDOR: `ensureSellerOwnsProductMiddleware`
 * only proved the seller owns `:id`, never that `:variant_id` (a second,
 * independent URL param on the same route) actually belongs to that
 * product. A seller could put their own product id in `:id` and any other
 * seller's variant id in `:variant_id` to mutate or delete it — and in the
 * test env (`MEDUSA_FF_PRODUCT_REQUEST=false`, same as this project's
 * `.env`), that change auto-confirms and applies immediately, with no
 * admin review in between.
 */
medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("Vendor /vendor/products/:id/variants/:variant_id — cross-seller isolation", () => {
      let container: MedusaContainer
      let sellerHeaders: { headers: Record<string, string> }
      let otherSellerHeaders: { headers: Record<string, string> }

      beforeAll(async () => {
        container = getContainer()
      })

      beforeEach(async () => {
        const a = await createSellerUser(container, {
          email: "variant-isolation-seller@test.com",
          name: "Variant Isolation Seller",
        })
        sellerHeaders = a.headers
        const b = await createSellerUser(container, {
          email: "variant-isolation-victim@test.com",
          name: "Variant Isolation Victim",
        })
        otherSellerHeaders = b.headers
      })

      const createVendorProduct = async (
        title: string,
        headers: { headers: Record<string, string> },
      ): Promise<string> => {
        const res = await api.post(`/vendor/products`, { title }, headers)
        return res.data.product.id
      }

      // Adds a variant (auto-confirmed in the test env) and returns its
      // applied row so tests can assert it is byte-for-byte unchanged
      // after a rejected cross-tenant attempt.
      const addVariant = async (
        productId: string,
        payload: Record<string, unknown>,
        headers: { headers: Record<string, string> },
      ): Promise<VariantRow> => {
        await api.post(`/vendor/products/${productId}/variants`, payload, headers)
        const got = await api.get(`/vendor/products/${productId}`, headers)
        const variant = (got.data.product.variants as VariantRow[]).find(
          (v) => v.title === payload.title,
        )
        if (!variant) {
          throw new Error(`Variant "${payload.title}" was not applied`)
        }
        return variant
      }

      const loadVariant = async (variantId: string): Promise<VariantRow | null> => {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const {
          data: [variant],
        } = await query.graph({
          entity: "variant",
          fields: ["id", "title", "sku"],
          filters: { id: variantId },
        })
        return (variant as VariantRow | undefined) ?? null
      }

      const stagedVariantActionsFor = async (
        variantId: string,
      ): Promise<Array<{ action: string }>> => {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: actions } = await query.graph({
          entity: "product_change_action",
          fields: ["action", "details"],
          filters: {
            action: [
              ProductChangeActionType.VARIANT_UPDATE,
              ProductChangeActionType.VARIANT_REMOVE,
            ],
          },
        })
        return (
          actions as Array<{
            action: string
            details: { variant_id?: string }
          }>
        ).filter((a) => a.details?.variant_id === variantId)
      }

      it("rejects a cross-seller VARIANT_UPDATE with 404 and leaves the victim variant untouched", async () => {
        const myProductId = await createVendorProduct("Attacker Product", sellerHeaders)
        const victimProductId = await createVendorProduct(
          "Victim Product",
          otherSellerHeaders,
        )
        const victimVariant = await addVariant(
          victimProductId,
          { title: "Victim Variant", sku: "VICTIM-SKU" },
          otherSellerHeaders,
        )

        const res = await api
          .post(
            `/vendor/products/${myProductId}/variants/${victimVariant.id}`,
            { title: "HACKED", sku: "HACKED-SKU" },
            sellerHeaders,
          )
          .catch((e) => e.response)

        expect(res.status).toBe(404)

        const stillThere = await loadVariant(victimVariant.id)
        expect(stillThere).not.toBeNull()
        expect(stillThere?.title).toBe("Victim Variant")
        expect(stillThere?.sku).toBe("VICTIM-SKU")

        const staged = await stagedVariantActionsFor(victimVariant.id)
        expect(staged).toHaveLength(0)
      })

      it("rejects a cross-seller VARIANT_REMOVE with 404 and leaves the victim variant untouched", async () => {
        const myProductId = await createVendorProduct("Attacker Product 2", sellerHeaders)
        const victimProductId = await createVendorProduct(
          "Victim Product 2",
          otherSellerHeaders,
        )
        const victimVariant = await addVariant(
          victimProductId,
          { title: "Victim Variant 2", sku: "VICTIM-SKU-2" },
          otherSellerHeaders,
        )

        const res = await api
          .delete(
            `/vendor/products/${myProductId}/variants/${victimVariant.id}`,
            sellerHeaders,
          )
          .catch((e) => e.response)

        expect(res.status).toBe(404)

        const stillThere = await loadVariant(victimVariant.id)
        expect(stillThere).not.toBeNull()
        expect(stillThere?.title).toBe("Victim Variant 2")

        const staged = await stagedVariantActionsFor(victimVariant.id)
        expect(staged).toHaveLength(0)
      })

      it("still allows a seller to update their own variant (no false positive)", async () => {
        const myProductId = await createVendorProduct("My Own Product", sellerHeaders)
        const myVariant = await addVariant(
          myProductId,
          { title: "My Variant", sku: "MY-SKU" },
          sellerHeaders,
        )

        const res = await api.post(
          `/vendor/products/${myProductId}/variants/${myVariant.id}`,
          { title: "My Variant", sku: "MY-SKU-UPDATED" },
          sellerHeaders,
        )

        expect(res.status).toBe(202)
        const updated = await loadVariant(myVariant.id)
        expect(updated?.sku).toBe("MY-SKU-UPDATED")
      })
    })
  },
})
