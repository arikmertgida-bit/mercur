import { MiddlewareRoute } from "@medusajs/framework/http"

import { requireAnyPermission } from "../../utils"
import { imageUpload, MAX_IMAGE_FILES } from "./file-validation"

export const vendorUploadsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/vendor/uploads",
    middlewares: [
      // Product media and the store logo/banner both upload through here.
      requireAnyPermission([
        { key: "products", right: "edit" },
        { key: "store", right: "edit" },
      ]),
      imageUpload.array("files", MAX_IMAGE_FILES),
    ],
  },
]
