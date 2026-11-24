import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MercurModules } from "@mercurjs/types"
import { REVIEW_MODULE } from "@acme/api/src/modules/reviews"
import type ReviewModuleService from "@acme/api/src/modules/reviews/service"

import { adminHeaders, createAdminUser } from "../../../helpers/create-admin-user"
import { createSellerUser } from "../../../helpers/create-seller-user"

jest.setTimeout(50000)

// Kayı's reviews module (apps/api/src/modules/reviews): a review is about a
// seller or a product, carries the rating and the customer's note; sellers
// answer through the vendor route, admins only read (moderation of reports
// lives under /admin/review-reports).
const seedSellerReview = async (
  container: MedusaContainer,
  sellerId: string,
  overrides: { rating?: number; customer_note?: string } = {}
) => {
  const reviewService = container.resolve<ReviewModuleService>(REVIEW_MODULE)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const review = await reviewService.createReviews({
    reference: "seller",
    reference_id: sellerId,
    rating: overrides.rating ?? 3,
    customer_note: overrides.customer_note ?? "It was okay",
  })

  await link.create([
    {
      [MercurModules.SELLER]: { seller_id: sellerId },
      [REVIEW_MODULE]: { review_id: review.id },
    },
  ])

  return review
}

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api, dbConnection }) => {
    describe("Admin - Reviews", () => {
      let appContainer: MedusaContainer
      let sellerId: string

      beforeAll(async () => {
        appContainer = getContainer()
      })

      beforeEach(async () => {
        await createAdminUser(dbConnection, adminHeaders, appContainer)
        const result = await createSellerUser(appContainer, { autoApprove: true })
        sellerId = result.seller.id
      })

      describe("GET /admin/reviews", () => {
        it("lists every review with its rating and reference", async () => {
          const review = await seedSellerReview(appContainer, sellerId, {
            rating: 4,
          })

          const response = await api.get("/admin/reviews", adminHeaders)

          expect(response.status).toEqual(200)
          expect(response.data.count).toEqual(1)
          expect(response.data.reviews[0]).toEqual(
            expect.objectContaining({
              id: review.id,
              reference: "seller",
              rating: 4,
              customer_note: "It was okay",
            })
          )
        })

        it("filters reviews by reference", async () => {
          await seedSellerReview(appContainer, sellerId)
          const reviewService =
            appContainer.resolve<ReviewModuleService>(REVIEW_MODULE)
          await reviewService.createReviews({
            reference: "product",
            reference_id: "prod_test",
            rating: 5,
            customer_note: "Great product",
          })

          const response = await api.get(
            "/admin/reviews?reference=product",
            adminHeaders
          )

          expect(response.status).toEqual(200)
          expect(response.data.count).toEqual(1)
          expect(response.data.reviews[0].reference).toEqual("product")
        })

        it("rejects an unknown reference", async () => {
          const response = await api
            .get("/admin/reviews?reference=order", adminHeaders)
            .catch((e) => e.response)

          expect(response.status).toEqual(400)
        })
      })

      describe("GET /admin/reviews/:id", () => {
        it("returns the review", async () => {
          const review = await seedSellerReview(appContainer, sellerId)

          const response = await api.get(
            `/admin/reviews/${review.id}`,
            adminHeaders
          )

          expect(response.status).toEqual(200)
          expect(response.data.review.id).toEqual(review.id)
        })

        it("404s for an unknown review", async () => {
          const response = await api
            .get("/admin/reviews/rev_missing", adminHeaders)
            .catch((e) => e.response)

          expect(response.status).toEqual(404)
        })
      })

      it("rejects a request without an admin session", async () => {
        const response = await api
          .get("/admin/reviews")
          .catch((e) => e.response)

        expect(response.status).toEqual(401)
      })
    })
  },
})
