import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { UseMutationOptions } from "@tanstack/react-query"
import { z } from "zod"
import { queryKeysFactory } from "@mercurjs/dashboard-shared"
import { InferClientOutput } from "@mercurjs/client"
import { client } from "../../lib/client"
import { HttpFetchError } from "../../lib/fetchQuery"
import { getCatchMessage } from "../../lib/errors"
import { logger } from "../../lib/logger"

declare const __BACKEND_URL__: string

const PRODUCTS_QUERY_KEY = "vendor_products" as const
export const productsQueryKeys = queryKeysFactory(PRODUCTS_QUERY_KEY)

const ImportProductsResponseSchema = z.object({
  summary: z.object({ created: z.number() }),
})
type ImportProductsResponse = z.infer<typeof ImportProductsResponseSchema>

const ImportErrorBodySchema = z.object({ message: z.string() }).passthrough()

const uploadProductImportCsv = async (
  file: File
): Promise<ImportProductsResponse> => {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${__BACKEND_URL__}/vendor/products/import`, {
    method: "POST",
    body: formData,
    credentials: "include",
  })

  if (!response.ok) {
    let message = "Ürünler içe aktarılırken bir hata oluştu."
    try {
      const parsed = ImportErrorBodySchema.safeParse(await response.json())
      if (parsed.success) {
        message = parsed.data.message
      }
    } catch (err) {
      logger.warn(
        `[product-import] Could not parse error response: ${getCatchMessage(
          err instanceof Error ? err : typeof err === "string" ? err : null
        )}`
      )
    }
    throw new HttpFetchError(message, response.status)
  }

  return ImportProductsResponseSchema.parse(await response.json())
}

export const useImportProducts = (
  options?: UseMutationOptions<ImportProductsResponse, HttpFetchError, File>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadProductImportCsv,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useExportProducts = (
  options?: UseMutationOptions<
    InferClientOutput<typeof client.vendor.products.export.mutate>,
    Error,
    void
  >
) => {
  return useMutation({
    mutationFn: () => client.vendor.products.export.mutate(),
    ...options,
  })
}
