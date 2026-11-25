import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/framework/types"

import {
  adminHeaders,
  createAdminUser,
} from "../../../helpers/create-admin-user"
import { createSellerUser } from "../../../helpers/create-seller-user"
import { createShippingProfile } from "../../../helpers/create-shipping-profile"

jest.setTimeout(60000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api, dbConnection }) => {
    describe("Admin - rich-text product description", () => {
      let appContainer: MedusaContainer

      beforeAll(() => {
        appContainer = getContainer()
      })

      // Every admin-created product belongs to exactly one store.
      let sellerId: string
      let profileId: string

      beforeEach(async () => {
        await createAdminUser(dbConnection, adminHeaders, appContainer)
        const { seller } = await createSellerUser(appContainer, {
          autoApprove: true,
        })
        sellerId = seller.id
        profileId = (
          await createShippingProfile(
            appContainer,
            { name: "Profil" },
            { seller_id: sellerId }
          )
        ).id
      })

      it("sanitizes the description on create", async () => {
        const res = await api.post(
          "/admin/products",
          {
            seller_ids: [sellerId], shipping_profile_id: profileId,
            title: "Rich Admin Product",
            description:
              '<h3>Specs</h3><ul><li><p>one</p></li></ul><script>alert(1)</script><p style="color:red">x</p>',
          },
          adminHeaders,
        )

        expect([200, 201]).toContain(res.status)
        expect(res.data.product.description).toBe(
          "<h3>Specs</h3><ul><li><p>one</p></li></ul><p>x</p>",
        )
      })

      it("sanitizes the description on update and keeps allowed images and links", async () => {
        const created = await api.post(
          "/admin/products",
          { title: "Rich Admin Update", seller_ids: [sellerId], shipping_profile_id: profileId },
          adminHeaders,
        )
        const productId = created.data.product.id

        const res = await api.post(
          `/admin/products/${productId}`,
          {
            description:
              '<p><a href="https://example.com">site</a></p><img src="https://cdn.example.com/a.png" alt="a" onerror="x()"><iframe src="https://evil.test"></iframe>',
          },
          adminHeaders,
        )

        expect(res.status).toBe(200)
        expect(res.data.product.description).toBe(
          '<p><a href="https://example.com" rel="noopener noreferrer nofollow" target="_blank">site</a></p><img src="https://cdn.example.com/a.png" alt="a" />',
        )
      })

      it("stores plain-text descriptions unchanged", async () => {
        const res = await api.post(
          "/admin/products",
          { title: "Plain", description: "Tom & Jerry\n5 < 6", seller_ids: [sellerId], shipping_profile_id: profileId },
          adminHeaders,
        )

        expect(res.data.product.description).toBe("Tom & Jerry\n5 < 6")
      })

      it("keeps a null description on update", async () => {
        const created = await api.post(
          "/admin/products",
          { title: "Nullable", description: "<p>x</p>", seller_ids: [sellerId], shipping_profile_id: profileId },
          adminHeaders,
        )

        const res = await api.post(
          `/admin/products/${created.data.product.id}`,
          { description: null },
          adminHeaders,
        )

        expect(res.data.product.description).toBeNull()
      })
    })
  },
})
