import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { getSellerId } from "./seller-context"

export function filterBySellerId() {
  return (
    req: MedusaRequest,
    _res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    req.filterableFields.seller_id = getSellerId(req)
    next()
  }
}
