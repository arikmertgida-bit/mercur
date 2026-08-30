import { createPromotionsWorkflow } from "@medusajs/core-flows"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { CreatePromotionDTO } from "@medusajs/framework/types"

import { generateVendorPromotionCodesStep, linkSellerPromotionStep } from "../steps"

type SellerPromotionInput = Omit<CreatePromotionDTO, "code">

type CreateSellerPromotionsWorkflowInput = {
  promotions: SellerPromotionInput[]
  seller_id: string
  preferredCode?: string | null
}

export const createSellerPromotionsWorkflow = createWorkflow(
  "create-seller-promotions",
  function (input: CreateSellerPromotionsWorkflowInput) {
    const promotionCount = transform(
      input.promotions,
      (promotions) => promotions.length
    )

    const { codes } = generateVendorPromotionCodesStep({
      seller_id: input.seller_id,
      count: promotionCount,
      preferredCode: input.preferredCode,
    })

    const promotionsWithCode = transform(
      { promotions: input.promotions, codes },
      (data): CreatePromotionDTO[] =>
        data.promotions.map((promotion, index) => ({
          ...promotion,
          code: data.codes[index],
        }))
    )

    const createdPromotions = createPromotionsWorkflow.runAsStep({
      input: {
        promotionsData: promotionsWithCode,
      },
    })

    const promotionIds = transform(
      createdPromotions,
      (promotions) => promotions.map((p) => p.id)
    )

    linkSellerPromotionStep({
      seller_id: input.seller_id,
      promotion_ids: promotionIds,
    })

    return new WorkflowResponse(createdPromotions)
  }
)
