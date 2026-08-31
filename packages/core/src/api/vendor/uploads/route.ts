import { uploadFilesWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { FileDTO, HttpTypes } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { fixMultipartFilenameEncoding } from "../../../utils/fix-multipart-filename-encoding"
import { matchesAllowedImageMagicBytes } from "./file-validation"

export const POST = async (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminUploadFile>,
  res: MedusaResponse<{ files: FileDTO[] }>
) => {
  const input = req.files as Express.Multer.File[]

  if (!input?.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No files were uploaded"
    )
  }

  const invalidFile = input.find((f) => !matchesAllowedImageMagicBytes(f.buffer))
  if (invalidFile) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `File "${invalidFile.originalname}" is not a valid image`
    )
  }

  const { result: files } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: input?.map((f) => ({
        filename: fixMultipartFilenameEncoding(f.originalname),
        mimeType: f.mimetype,
        content: f.buffer.toString("base64"),
        access: "public",
      })),
    },
  })

  res.json({ files })
}
