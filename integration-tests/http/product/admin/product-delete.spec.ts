import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ProductChangeActionType,
  ProductChangeStatus,
} from "@mercurjs/types"

import { createSellerUser } from "../../../helpers/create-seller-user"
import { createVendorProduct } from "../../../helpers/create-product"
import { approveSeller } from "../../../helpers/split-order-checkout"
import {
  adminHeaders,
  createAdminUser,
} from "../../../helpers/create-admin-user"

jest.setTimeout(60000)

type Headers = { headers: Record<string, string> }

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api, dbConnection }) => {
    describe("Product delete", () => {
      let container: MedusaContainer
      let sellerHeaders: Headers

      beforeAll(async () => {
        container = getContainer()
      })

      beforeEach(async () => {
        await createAdminUser(dbConnection, adminHeaders, container)

        const seller = await createSellerUser(container, {
          email: "product-delete-seller@test.com",
          name: "Product Delete Seller",
        })
        await approveSeller(container, seller.seller.id)
        sellerHeaders = seller.headers
      })

      const expectAdminNotFound = async (productId: string) => {
        const got = await api
          .get(`/admin/products/${productId}`, adminHeaders)
          .catch((e) => e.response)
        expect(got.status).toEqual(404)
      }

      it("admin DELETE deletes the product and records a confirmed PRODUCT_DELETE change", async () => {
        const product = await createVendorProduct(api, sellerHeaders, {
          title: `Delete Admin ${Date.now()}`,
          variants: [{ title: "Default" }],
        })

        const res = await api.delete(
          `/admin/products/${product.id}`,
          adminHeaders
        )
        expect(res.status).toEqual(200)
        expect(res.data).toEqual({
          id: product.id,
          object: "product",
          deleted: true,
        })
        await expectAdminNotFound(product.id)

        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const { data: changes } = await query.graph({
          entity: "product_change",
          fields: ["id", "status", "actions.action"],
          filters: { product_id: product.id },
        })
        const deleteChange = (
          changes as Array<{ status: string; actions: { action: string }[] }>
        ).find((c) =>
          c.actions.some(
            (a) => a.action === ProductChangeActionType.PRODUCT_DELETE
          )
        )
        expect(deleteChange?.status).toEqual(ProductChangeStatus.CONFIRMED)
      })

      it("vendor DELETE of the seller's own product deletes it", async () => {
        const product = await createVendorProduct(api, sellerHeaders, {
          title: `Delete Vendor ${Date.now()}`,
          variants: [{ title: "Default" }],
        })

        const res = await api.delete(
          `/vendor/products/${product.id}`,
          sellerHeaders
        )
        expect(res.status).toEqual(202)
        await expectAdminNotFound(product.id)
      })

      it("leaves other products untouched", async () => {
        const doomed = await createVendorProduct(api, sellerHeaders, {
          title: `Delete Doomed ${Date.now()}`,
          variants: [{ title: "Default" }],
        })
        const kept = await createVendorProduct(api, sellerHeaders, {
          title: `Delete Kept ${Date.now()}`,
          variants: [{ title: "Default" }],
        })

        await api.delete(`/admin/products/${doomed.id}`, adminHeaders)

        const got = await api.get(`/admin/products/${kept.id}`, adminHeaders)
        expect(got.status).toEqual(200)
        expect(got.data.product.id).toEqual(kept.id)
      })
    })
  },
})
