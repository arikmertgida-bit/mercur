import { MiddlewareRoute } from "@medusajs/framework/http"

import { imageUpload, MAX_IMAGE_FILES } from "./file-validation"

export const vendorUploadsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/vendor/uploads",
    middlewares: [imageUpload.array("files", MAX_IMAGE_FILES)],
  },
]
