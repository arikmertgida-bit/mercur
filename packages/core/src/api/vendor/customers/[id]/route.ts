import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { validateSellerCustomer } from "../helpers"
import { getSellerId } from "../../../utils/seller-context"
import { VendorGetCustomerParamsType } from "../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<
    Partial<VendorGetCustomerParamsType>,
    VendorGetCustomerParamsType
  >,
  res: MedusaResponse<HttpTypes.VendorCustomerResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const sellerId = getSellerId(req)

  await validateSellerCustomer(req.scope, sellerId, req.params.id)

  const {
    data: [customer],
  } = await query.graph({
    entity: "customer",
    fields: req.queryConfig.fields,
    filters: { id: req.params.id },
  })

  if (!customer) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer with id ${req.params.id} was not found`
    )
  }

  if (customer.groups?.length) {
    const { data: ownedLinks } = await query.graph({
      entity: "customer_group_seller",
      fields: ["customer_group_id"],
      filters: {
        seller_id: sellerId,
        customer_group_id: customer.groups.map((g) => g.id),
      },
    })

    const ownedGroupIds = new Set(
      ownedLinks.map((link) => link.customer_group_id)
    )
    customer.groups = customer.groups.filter((g) => ownedGroupIds.has(g.id))
  }

  res.json({ customer })
}
