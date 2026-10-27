import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  MercurModules,
  ProfessionalDetailsDTO,
  UpdateProfessionalDetailsDTO,
} from "@mercurjs/types"

import SellerModuleService from "../../../modules/seller/service"


type UpdateProfessionalDetailsCompensation = {
  existing: ProfessionalDetailsDTO | null
  seller_id: string
}

export const updateSellerProfessionalDetailsStep = createStep<
  { seller_id: string; data: UpdateProfessionalDetailsDTO },
  ProfessionalDetailsDTO,
  UpdateProfessionalDetailsCompensation
>(
  "update-seller-professional-details",
  async (
    { seller_id, data },
    { container }
  ) => {
    const service =
      container.resolve<SellerModuleService>(MercurModules.SELLER)

    const [seller] = await service.listSellers(
      { id: seller_id },
      { relations: ["professional_details"] }
    )

    if (seller.professional_details) {
      const updated = await service.updateProfessionalDetails({
        id: seller.professional_details.id,
        ...data,
      })
      return new StepResponse(updated, {
        existing: seller.professional_details,
        seller_id,
      })
    }

    const created = await service.createProfessionalDetails({
      ...data,
      seller_id,
    })
    return new StepResponse(created, { existing: null, seller_id })
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return
    }
    const { existing, seller_id } = compensation
    const service =
      container.resolve<SellerModuleService>(MercurModules.SELLER)
    if (existing) {
      await service.updateProfessionalDetails(existing)
    } else {
      const current = await service.listProfessionalDetails({ seller_id })
      if (current.length > 0) {
        await service.deleteProfessionalDetails([current[0].id])
      }
    }
  }
)
