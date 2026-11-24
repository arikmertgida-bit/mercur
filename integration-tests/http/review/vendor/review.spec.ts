import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { MercurModules } from "@mercurjs/types"
import { createProductsWorkflow } from "@mercurjs/core/workflows"
import { REVIEW_MODULE } from "@acme/api/src/modules/reviews"
import type ReviewModuleService from "@acme/api/src/modules/reviews/service"

import { createSellerUser } from "../../../helpers/create-seller-user"

jest.setTimeout(50000)

// Kayı's reviews module: a seller sees reviews written about its store
// (seller_review link) and about its own products (product_review link via
// product_seller). Answering stores seller_note and opens a reply thread
// (review-social); rating and the customer's note stay the customer's.
const seedSellerReview = async (
  container: MedusaContainer,
  sellerId: string,
  customerNote = "Great store"
) => {
  const service = container.resolve<ReviewModuleService>(REVIEW_MODULE)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const review = await service.createReviews({
    reference: "seller",
    reference_id: sellerId,
    rating: 4,
    customer_note: customerNote,
  })

  await link.create([
    {
      [MercurModules.SELLER]: { seller_id: sellerId },
      [REVIEW_MODULE]: { review_id: review.id },
    },
  ])

  return review
}

let reviewedProductCount = 0

const seedProductReview = async (
  container: MedusaContainer,
  sellerId: string
) => {
  reviewedProductCount += 1
  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: `Reviewed Product ${reviewedProductCount}`,
          status: "published",
          seller_ids: [sellerId],
        },
      ],
      created_by: sellerId,
    },
  })
  const productId = result[0].id

  const service = container.resolve<ReviewModuleService>(REVIEW_MODULE)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const review = await service.createReviews({
    reference: "product",
    reference_id: productId,
    rating: 5,
    customer_note: "Lovely product",
  })

  await link.create([
    {
      [Modules.PRODUCT]: { product_id: productId },
      [REVIEW_MODULE]: { review_id: review.id },
    },
  ])

  return review
}

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("Vendor - Reviews", () => {
      let appContainer: MedusaContainer
      let sellerHeaders: { headers: Record<string, string> }
      let sellerId: string
      let otherSellerId: string

      beforeAll(() => {
        appContainer = getContainer()
      })

      beforeEach(async () => {
        const result = await createSellerUser(appContainer, {
          email: "seller@test.com",
          name: "Test Seller",
          autoApprove: true,
        })
        sellerHeaders = result.headers
        sellerId = result.seller.id

        const other = await createSellerUser(appContainer, {
          email: "other@test.com",
          name: "Other Seller",
          autoApprove: true,
        })
        otherSellerId = other.seller.id
      })

      describe("GET /vendor/reviews", () => {
        it("lists the reviews of the seller's store and products only", async () => {
          const storeReview = await seedSellerReview(appContainer, sellerId)
          const productReview = await seedProductReview(appContainer, sellerId)
          await seedSellerReview(appContainer, otherSellerId, "Not mine")
          await seedProductReview(appContainer, otherSellerId)

          const response = await api.get("/vendor/reviews", sellerHeaders)

          expect(response.status).toEqual(200)
          expect(response.data.count).toEqual(2)
          expect(
            response.data.reviews.map((r: { id: string }) => r.id).sort()
          ).toEqual([storeReview.id, productReview.id].sort())
        })
      })

      describe("GET /vendor/reviews/:id", () => {
        it("returns a review about one of the seller's products", async () => {
          const review = await seedProductReview(appContainer, sellerId)

          const response = await api.get(
            `/vendor/reviews/${review.id}`,
            sellerHeaders
          )

          expect(response.status).toEqual(200)
          expect(response.data.review.id).toEqual(review.id)
          expect(response.data.review.is_awaiting_reply).toBe(true)
        })

        it("404s for a review that belongs to another seller", async () => {
          const foreign = await seedSellerReview(appContainer, otherSellerId)
          const foreignProduct = await seedProductReview(
            appContainer,
            otherSellerId
          )

          for (const id of [foreign.id, foreignProduct.id]) {
            const response = await api
              .get(`/vendor/reviews/${id}`, sellerHeaders)
              .catch((e) => e.response)

            expect(response.status).toEqual(404)
          }
        })
      })

      describe("POST /vendor/reviews/:id (reply)", () => {
        it("stores the seller's reply", async () => {
          const review = await seedSellerReview(appContainer, sellerId)

          const response = await api.post(
            `/vendor/reviews/${review.id}`,
            { seller_note: "Thank you for your feedback." },
            sellerHeaders
          )

          expect(response.status).toEqual(200)
          expect(response.data.review.seller_note).toEqual(
            "Thank you for your feedback."
          )

          const detail = await api.get(
            `/vendor/reviews/${review.id}`,
            sellerHeaders
          )
          expect(detail.data.review.is_awaiting_reply).toBe(false)
        })

        it("rejects an empty or too long reply", async () => {
          const review = await seedSellerReview(appContainer, sellerId)

          for (const seller_note of ["", "x".repeat(301)]) {
            const response = await api
              .post(`/vendor/reviews/${review.id}`, { seller_note }, sellerHeaders)
              .catch((e) => e.response)

            expect(response.status).toEqual(400)
          }
        })

        it("does not let the seller change the rating or the customer's note", async () => {
          const review = await seedSellerReview(appContainer, sellerId)

          const response = await api
            .post(
              `/vendor/reviews/${review.id}`,
              { seller_note: "Thanks", rating: 1, customer_note: "Edited" },
              sellerHeaders
            )
            .catch((e) => e.response)

          expect(response.status).toEqual(400)

          const service = appContainer.resolve<ReviewModuleService>(REVIEW_MODULE)
          const [persisted] = await service.listReviews({ id: review.id })

          expect(persisted.rating).toEqual(4)
          expect(persisted.customer_note).toEqual("Great store")
          expect(persisted.seller_note).toBeNull()
        })

        it("404s when replying to another seller's review", async () => {
          const foreign = await seedSellerReview(appContainer, otherSellerId)

          const response = await api
            .post(
              `/vendor/reviews/${foreign.id}`,
              { seller_note: "Not my review" },
              sellerHeaders
            )
            .catch((e) => e.response)

          expect(response.status).toEqual(404)

          const service = appContainer.resolve<ReviewModuleService>(REVIEW_MODULE)
          const [persisted] = await service.listReviews({ id: foreign.id })
          expect(persisted.seller_note).toBeNull()
        })
      })
    })
  },
})
