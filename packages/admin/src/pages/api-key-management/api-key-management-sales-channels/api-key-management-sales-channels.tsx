
import { z } from "zod"
import { RouteFocusModal } from "../../../components/modals"
import { useApiKey } from "../../../hooks/api/api-keys"
import { ApiKeySalesChannelsForm } from "./components/api-key-sales-channels-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

const ApiKeySalesChannelsSchema = z.object({
  sales_channels: z.array(z.object({ id: z.string() })).nullish(),
})

export const ApiKeyManagementAddSalesChannels = () => {
  const id = useRequiredParam("id")

  const { api_key, isLoading, isError, error } = useApiKey(id)

  // Medusa's API key type has no `sales_channels`; the key's linked sales
  // channels are part of the response, so they are read from it.
  const parsedKey = ApiKeySalesChannelsSchema.safeParse(api_key)
  const preSelected = parsedKey.success
    ? parsedKey.data.sales_channels?.map((sc) => sc.id)
    : undefined

  const ready = !isLoading && api_key

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal data-testid="publishable-api-key-sales-channels-modal">
      {ready && (
        <ApiKeySalesChannelsForm apiKey={id} preSelected={preSelected} />
      )}
    </RouteFocusModal>
  )
}
