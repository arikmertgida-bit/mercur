import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/framework/types"
import {
  createAdminUser,
  adminHeaders,
} from "../../../helpers/create-admin-user"
import { createSellerUser } from "../../../helpers/create-seller-user"
import { createVendorProduct } from "../../../helpers/create-product"

jest.setTimeout(60000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api, dbConnection }) => {
    describe("Admin - Promotion rule attribute options", () => {
      let appContainer: MedusaContainer

      beforeAll(async () => {
        appContainer = getContainer()
        await createAdminUser(dbConnection, adminHeaders, appContainer)
      })

      const idsOf = (attributes: any[]) => attributes.map((a) => a.id)

      it("exposes the general rule attributes", async () => {
        const response = await api.get(
          `/admin/promotions/rule-attribute-options/rules?promotion_type=standard&application_method_type=percentage`,
          adminHeaders
        )

        expect(response.status).toEqual(200)
        const ids = idsOf(response.data.attributes)
        expect(ids).toEqual(
          expect.arrayContaining([
            "customer_group",
            "region",
            "country",
            "sales_channel",
            "currency_code",
          ])
        )
      })

      it("exposes the product item target-rule attributes", async () => {
        const response = await api.get(
          `/admin/promotions/rule-attribute-options/target-rules?promotion_type=standard&application_method_target_type=items`,
          adminHeaders
        )

        expect(response.status).toEqual(200)
        const ids = idsOf(response.data.attributes)
        expect(ids).toEqual(
          expect.arrayContaining([
            "product",
            "product_category",
            "product_collection",
            "product_type",
            "product_tag",
          ])
        )
        expect(ids).not.toContain("offer")
      })

      it("swaps to shipping option type attributes for shipping_methods target", async () => {
        const response = await api.get(
          `/admin/promotions/rule-attribute-options/target-rules?promotion_type=standard&application_method_target_type=shipping_methods`,
          adminHeaders
        )

        expect(response.status).toEqual(200)
        const ids = idsOf(response.data.attributes)
        expect(ids).toContain("shipping_option_type")
        expect(ids).not.toContain("offer")
      })

      it("adds the buyget disguised quantity rules for buyget promotions", async () => {
        const buyRules = await api.get(
          `/admin/promotions/rule-attribute-options/buy-rules?promotion_type=buyget&application_method_target_type=items`,
          adminHeaders
        )
        const targetRules = await api.get(
          `/admin/promotions/rule-attribute-options/target-rules?promotion_type=buyget&application_method_target_type=items`,
          adminHeaders
        )

        expect(idsOf(buyRules.data.attributes)).toContain(
          "buy_rules_min_quantity"
        )
        expect(idsOf(targetRules.data.attributes)).toContain(
          "apply_to_quantity"
        )
      })

      it("offers every seller's products, narrowed to one store by seller_id", async () => {
        const first = await createSellerUser(appContainer, {
          email: "admin-rule-values-1@test.com",
          name: "Admin Rule Values One",
          autoApprove: true,
        })
        const firstProduct = await createVendorProduct(api, first.headers, {
          title: "Admin Rule Product One",
        })
        const second = await createSellerUser(appContainer, {
          email: "admin-rule-values-2@test.com",
          name: "Admin Rule Values Two",
          autoApprove: true,
        })
        const secondProduct = await createVendorProduct(api, second.headers, {
          title: "Admin Rule Product Two",
        })

        const all = await api.get(
          `/admin/promotions/rule-value-options/target-rules/product?limit=50&offset=0&application_method_target_type=items`,
          adminHeaders
        )
        expect(all.status).toEqual(200)
        const allValues = all.data.values.map((v: any) => v.value)
        expect(allValues).toEqual(
          expect.arrayContaining([firstProduct.id, secondProduct.id])
        )

        const scoped = await api.get(
          `/admin/promotions/rule-value-options/target-rules/product?limit=50&offset=0&application_method_target_type=items&seller_id=${first.seller.id}`,
          adminHeaders
        )
        expect(scoped.status).toEqual(200)
        const scopedValues = scoped.data.values.map((v: any) => v.value)
        expect(scopedValues).toContain(firstProduct.id)
        expect(scopedValues).not.toContain(secondProduct.id)
      })
    })
  },
})
