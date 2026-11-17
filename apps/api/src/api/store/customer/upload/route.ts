import { uploadFilesWorkflow, deleteFilesWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { StoreDeleteCustomerUploadType } from "./validators"
import { fixMultipartFilenameEncoding } from "../../../../lib/fix-multipart-filename-encoding"
import { matchesAllowedImageMagicBytes } from "../../../../lib/file-validation"
import {
  customerUploadFilename,
  isCustomerUploadKey,
} from "../../../../lib/customer-upload"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const files = Array.isArray(req.files) ? req.files : []

  if (!files.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No files were uploaded"
    )
  }

  const invalidFile = files.find((f) => !matchesAllowedImageMagicBytes(f.buffer))
  if (invalidFile) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `File "${invalidFile.originalname}" is not a valid image`
    )
  }

  const customerId = req.auth_context.actor_id

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: files.map((file) => ({
        filename: customerUploadFilename(
          customerId,
          fixMultipartFilenameEncoding(file.originalname)
        ),
        mimeType: file.mimetype,
        content: file.buffer.toString("base64"),
        access: "public" as const,
      })),
    },
  })

  res.json({ files: result })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest<StoreDeleteCustomerUploadType>,
  res: MedusaResponse
) => {
  const { fileId } = req.validatedBody

  if (!isCustomerUploadKey(fileId, req.auth_context.actor_id)) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `File with id: ${fileId} was not found`
    )
  }

  await deleteFilesWorkflow(req.scope).run({
    input: { ids: [fileId] },
  })

  res.json({ id: req.validatedBody.fileId, object: "file", deleted: true })
}
