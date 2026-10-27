import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { linkCustomersToCustomerGroupWorkflow } from "@medusajs/core-flows"
import { HttpTypes } from "@mercurjs/types"

import { validateSellerCustomer } from "../../../customers/helpers"
import { refetchCustomerGroup, validateSellerCustomerGroup } from "../../helpers"
import { VendorManageCustomerGroupCustomersType } from "../../validators"
import { getSellerId } from "../../../../utils/seller-context"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorManageCustomerGroupCustomersType>,
  res: MedusaResponse<HttpTypes.VendorCustomerGroupResponse>
) => {
  const { id } = req.params
  const sellerId = getSellerId(req)

  await validateSellerCustomerGroup(req.scope, sellerId, id)

  const add = req.validatedBody.add ?? []
  const remove = req.validatedBody.remove ?? []

  await validateSellerCustomer(req.scope, sellerId, [...add, ...remove])

  await linkCustomersToCustomerGroupWorkflow(req.scope).run({
    input: { id, add, remove },
  })

  const customer_group = await refetchCustomerGroup(
    id,
    req.scope,
    req.queryConfig.fields
  )

  res.json({ customer_group })
}
