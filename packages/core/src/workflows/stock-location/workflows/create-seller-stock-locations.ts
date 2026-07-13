import {
  associateLocationsWithSalesChannelsStep,
  createStockLocationsWorkflow,
  useQueryGraphStep,
} from "@medusajs/core-flows"
import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { linkSellerStockLocationStep } from "../steps"
import { CreateStockLocationInput } from "@medusajs/framework/types"

type CreateSellerStockLocationsWorkflowInput = {
  locations: CreateStockLocationInput[]
  seller_id: string
}

export const createSellerStockLocationsWorkflow = createWorkflow(
  "create-seller-stock-locations",
  function (input: CreateSellerStockLocationsWorkflowInput) {
    const createdStockLocations = createStockLocationsWorkflow.runAsStep({
      input: {
        locations: input.locations,
      },
    })

    const stockLocationIds = transform(
      createdStockLocations,
      (stockLocations) => stockLocations.map((sl) => sl.id)
    )

    linkSellerStockLocationStep({
      seller_id: input.seller_id,
      stock_location_ids: stockLocationIds,
    })

    // A stock location with no sales-channel link is invisible to
    // sales-channel-scoped inventory availability checks
    // (`getVariantAvailability`), which silently makes every variant stocked
    // here show as unavailable on the storefront regardless of real stock.
    // Every seller-created location is born into the store's configured
    // default channel, mirroring how `createProductsWorkflow` already
    // handles this for products (see `create-products.ts`).
    const storeQuery = useQueryGraphStep({
      entity: "store",
      fields: ["id", "default_sales_channel_id"],
      options: { isList: false },
    }).config({ name: "mercur-create-seller-stock-locations-store" })

    const salesChannelLinks = transform(
      { stockLocationIds, storeQuery },
      ({ stockLocationIds, storeQuery }) => {
        const defaultSalesChannelId = storeQuery.data?.default_sales_channel_id
        if (!defaultSalesChannelId) {
          return []
        }
        return stockLocationIds.map((locationId) => ({
          sales_channel_id: defaultSalesChannelId,
          location_id: locationId,
        }))
      }
    )

    when(
      { salesChannelLinks },
      ({ salesChannelLinks }) => salesChannelLinks.length > 0
    ).then(() =>
      associateLocationsWithSalesChannelsStep({ links: salesChannelLinks })
    )

    return new WorkflowResponse(createdStockLocations)
  }
)
