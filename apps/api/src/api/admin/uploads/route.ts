import { uploadFilesWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { fixMultipartFilenameEncoding } from "../../../lib/fix-multipart-filename-encoding"

// Overrides Medusa core's `/admin/uploads` POST route handler (project-level
// `route.ts` files take precedence over the same path contributed by core —
// the same mechanism Mercur itself uses for e.g. `admin/products`, see
// `disable-medusa-middlewares.ts`). Core's own middleware chain for this
// path (multer, query validation, policies) still runs unchanged; only the
// filename passed into `uploadFilesWorkflow` is corrected before storage —
// see `fixMultipartFilenameEncoding` for why that is necessary. This is
// what the admin panel's category/product image uploads go through.
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const input = Array.isArray(req.files) ? req.files : []

  if (!input.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No files were uploaded"
    )
  }

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: input.map((f) => ({
        filename: fixMultipartFilenameEncoding(f.originalname),
        mimeType: f.mimetype,
        content: f.buffer.toString("base64"),
        access: "public" as const,
      })),
    },
  })

  res.status(200).json({ files: result })
}
