import { uploadFilesWorkflow, deleteFilesWorkflow } from "@medusajs/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { StoreDeleteCustomerUploadType } from "./validators"

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

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: files.map((file) => ({
        filename: file.originalname,
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
  await deleteFilesWorkflow(req.scope).run({
    input: { ids: [req.validatedBody.fileId] },
  })

  res.json({ id: req.validatedBody.fileId, object: "file", deleted: true })
}
