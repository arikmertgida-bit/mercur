import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MercurModules, ProfessionalDetailsDTO } from "@mercurjs/types"

import SellerModuleService from "../../../modules/seller/service"

// The hand-authored `ProfessionalDetailsDTO` omits `seller_id`, but the real
// entity returned by `listProfessionalDetails` always carries its owning
// seller's id — needed here to recreate the record on compensate.
type ProfessionalDetailsWithSeller = ProfessionalDetailsDTO & {
  seller_id: string
}

export const deleteSellerProfessionalDetailsStep = createStep<
  { seller_id: string },
  void,
  ProfessionalDetailsWithSeller | null
>(
  "delete-seller-professional-details",
  async ({ seller_id }, { container }) => {
    const service =
      container.resolve<SellerModuleService>(MercurModules.SELLER)

    const existing = await service.listProfessionalDetails({
      seller_id,
    })

    if (existing.length > 0) {
      await service.deleteProfessionalDetails([existing[0].id])
      return new StepResponse(void 0, existing[0])
    }

    return new StepResponse(void 0, null)
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }

    const service =
      container.resolve<SellerModuleService>(MercurModules.SELLER)

    await service.createProfessionalDetails({
      corporate_name: previous.corporate_name,
      registration_number: previous.registration_number,
      tax_id: previous.tax_id,
      seller_id: previous.seller_id,
    })
  }
)
