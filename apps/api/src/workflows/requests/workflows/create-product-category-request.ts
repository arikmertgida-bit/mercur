import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createProductCategoriesWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { upsertCustomFieldsStep } from "@mercurjs/core/workflows"

import { RequestStatus } from "../../../types/requests"

type CreateProductCategoryRequestWorkflowInput = {
  product_category: {
    name: string
    handle?: string
    description?: string
    is_active?: boolean
    is_internal?: boolean
    parent_category_id?: string | null
    metadata?: Record<string, unknown>
  }
  submitter_id: string
}

export const createProductCategoryRequestWorkflow = createWorkflow(
  "create-product-category-request",
  function (input: CreateProductCategoryRequestWorkflowInput) {
    const categories = createProductCategoriesWorkflow.runAsStep({
      input: {
        product_categories: [input.product_category],
      },
    })

    const { category, upsertInput } = transform(
      { categories, input },
      (data) => {
        const category = data.categories[0]
        if (!category) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            "Failed to create product category"
          )
        }
        return {
          category,
          upsertInput: {
            alias: "product_category",
            data: {
              id: category.id,
              request_status: RequestStatus.PENDING,
              submitter_id: data.input.submitter_id,
            },
          },
        }
      }
    )

    upsertCustomFieldsStep(upsertInput)

    return new WorkflowResponse(category)
  }
)
