import {
  createHook,
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  emitEventStep,
  setAuthAppMetadataStep,
} from "@medusajs/medusa/core-flows"
import {
  CreateSellerDTO,
  SellerRole,
  SellerStatus,
  UpdateSellerAddressDTO,
  UpdateProfessionalDetailsDTO,
  UpdatePaymentDetailsDTO,
} from "@mercurjs/types"
import { AdditionalData } from "@medusajs/framework/types"

import {
  createSellersStep,
  upsertMembersStep,
  createSellerMembersStep,
} from "../steps"
import { SellerWorkflowEvents } from "../../events"
import { updateSellerAddressWorkflow } from "./update-seller-address"
import { updateSellerProfessionalDetailsWorkflow } from "./update-seller-professional-details"
import { updateSellerPaymentDetailsWorkflow } from "./update-seller-payment-details"
import { ensureDefined } from "../../../utils/ensure-defined"

export const createSellerAccountWorkflowId = "create-seller-account"

type CreateSellerAccountWorkflowInput = {
  auth_identity_id: string
  seller: CreateSellerDTO
  member_email?: string
  member_id?: string
  first_name?: string
  last_name?: string
  address?: UpdateSellerAddressDTO
  professional_details?: UpdateProfessionalDetailsDTO
  payment_details?: UpdatePaymentDetailsDTO
} & AdditionalData

export const createSellerAccountWorkflow = createWorkflow(
  createSellerAccountWorkflowId,
  function (input: CreateSellerAccountWorkflowInput) {
    const validate = createHook("validate", {
      input,
    })

    const sellerData = transform(input, ({ seller }) => [
      { ...seller, status: SellerStatus.PENDING_APPROVAL },
    ])

    const sellers = createSellersStep(sellerData)
    const seller = transform({ sellers }, ({ sellers }) => sellers[0])

    const newMember = when('no-existing-member', input, ({ member_id }) => !member_id).then(() => {
      const members = upsertMembersStep(
        transform(input, ({ member_email, first_name, last_name }) => [
          {
            email: ensureDefined(member_email, "member_email"),
            first_name: first_name ?? null,
            last_name: last_name ?? null,
          },
        ])
      )
      const member = transform({ members }, ({ members }) => members[0])

      setAuthAppMetadataStep({
        authIdentityId: input.auth_identity_id,
        actorType: "member",
        value: member.id,
      })

      return member
    })

    const memberId = transform(
      { input, newMember },
      ({ input, newMember }) =>
        ensureDefined(input.member_id || newMember?.id, "member_id")
    )

    createSellerMembersStep(
      transform(
        { seller, memberId },
        ({ seller, memberId }) => [
          {
            seller_id: seller.id,
            member_id: memberId,
            role_id: SellerRole.SELLER_ADMINISTRATION,
            is_owner: true,
          },
        ]
      )
    )

    when(input, ({ address }) => !!address).then(() => {
      updateSellerAddressWorkflow.runAsStep({
        input: transform({ seller, input }, ({ seller, input }) => ({
          seller_id: seller.id,
          data: ensureDefined(input.address, "address"),
        })),
      })
    })

    when(input, ({ professional_details }) => !!professional_details).then(
      () => {
        updateSellerProfessionalDetailsWorkflow.runAsStep({
          input: transform({ seller, input }, ({ seller, input }) => ({
            seller_id: seller.id,
            data: ensureDefined(
              input.professional_details,
              "professional_details"
            ),
          })),
        })
      }
    )

    when(input, ({ payment_details }) => !!payment_details).then(() => {
      updateSellerPaymentDetailsWorkflow.runAsStep({
        input: transform({ seller, input }, ({ seller, input }) => ({
          seller_id: seller.id,
          data: ensureDefined(input.payment_details, "payment_details"),
        })),
      })
    })

    const sellerAccountCreated = createHook("sellerAccountCreated", {
      seller,
      member_id: memberId,
      additional_data: input.additional_data,
    })

    emitEventStep({
      eventName: SellerWorkflowEvents.CREATED,
      data: [{ id: seller.id }],
    })

    return new WorkflowResponse(seller, { hooks: [validate, sellerAccountCreated] })
  }
)
