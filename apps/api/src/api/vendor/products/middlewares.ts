import { MiddlewareRoute } from "@medusajs/medusa"
import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { SellerStatus } from "@mercurjs/types"
import type {} from "@mercurjs/core/types/seller-context"
import multer from "multer"

const upload = multer({ storage: multer.memoryStorage() })

export const productImportExportMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/vendor/products/import",
    middlewares: [upload.single("file")],
  },
]

/**
 * Askıya alınmış (`suspended`), onay bekleyen (`pending_approval`) veya
 * feshedilmiş (`terminated`) bir mağaza ürün oluşturamaz, düzenleyemez
 * veya silemez — yalnızca `open` durumundaki satıcılar bu uçlardan
 * geçebilir. Kısıtlama, admin mağazayı tekrar `open` yapana kadar
 * geçerliliğini korur.
 */
const requireActiveSellerMiddleware = (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): void => {
  const sellerStatus = req.seller_context?.seller_member.seller.status

  if (sellerStatus !== undefined && sellerStatus !== SellerStatus.OPEN) {
    next(
      new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Mağazanız yönetim tarafından askıya alınmıştır, bu işlemi gerçekleştiremezsiniz."
      )
    )
    return
  }

  next()
}

export const vendorProductActiveSellerMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/vendor/products",
    middlewares: [requireActiveSellerMiddleware],
  },
  {
    method: ["POST", "DELETE"],
    matcher: "/vendor/products/:id",
    middlewares: [requireActiveSellerMiddleware],
  },
]
