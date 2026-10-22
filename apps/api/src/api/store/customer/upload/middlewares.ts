import { authenticate, validateAndTransformBody } from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

import { StoreDeleteCustomerUpload } from "./validators"
import { imageUpload, MAX_IMAGE_FILES } from "../../../../lib/file-validation"

export const storeCustomerUploadMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/customer/upload",
    middlewares: [
      authenticate("customer", ["bearer", "session"]),
      imageUpload.array("files", MAX_IMAGE_FILES),
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/store/customer/upload",
    middlewares: [
      authenticate("customer", ["bearer", "session"]),
      validateAndTransformBody(StoreDeleteCustomerUpload),
    ],
  },
]
