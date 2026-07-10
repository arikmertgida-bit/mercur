import multer from "multer"
import { authenticate, validateAndTransformBody } from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

import { StoreDeleteCustomerUpload } from "./validators"

const upload = multer({ storage: multer.memoryStorage() })

export const storeCustomerUploadMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/customer/upload",
    middlewares: [
      authenticate("customer", ["bearer", "session"]),
      upload.array("files"),
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
