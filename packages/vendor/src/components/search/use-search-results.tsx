import { keepPreviousData } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  useCampaigns,
  useCollections,
  useCustomers,
  useInventoryItems,
  useOrders,
  usePriceLists,
  useProductCategories,
  useProducts,
  useProductTags,
  useProductTypes,
  usePromotions,
  useStockLocations,
} from "../../hooks/api"
import { Shortcut, ShortcutType } from "../../providers/keybind-provider"
import { useGlobalShortcuts } from "../../providers/keybind-provider/hooks"
import { useSearch } from "../../providers/search-provider"
import {
  DynamicSearchResult,
  DynamicSearchResultItem,
  SearchArea,
} from "./types"
import { useSearchAreaAccess } from "./use-search-area-access"

type UseSearchProps = {
  q?: string
  limit: number
  area?: SearchArea
}

export const useSearchResults = ({
  q,
  limit,
  area = "all",
}: UseSearchProps) => {
  const staticResults = useStaticSearchResults(area)
  const { dynamicResults, isFetching } = useDynamicSearchResults(area, limit, q)

  return {
    staticResults,
    dynamicResults,
    isFetching,
  }
}

const useStaticSearchResults = (currentArea: SearchArea) => {
  const globalCommands = useGlobalShortcuts()

  const results = useMemo(() => {
    const groups = new Map<ShortcutType, Shortcut[]>()

    globalCommands.forEach((command) => {
      const group = groups.get(command.type) || []
      group.push(command)
      groups.set(command.type, group)
    })

    let filteredGroups: [ShortcutType, Shortcut[]][]

    switch (currentArea) {
      case "all":
        filteredGroups = Array.from(groups)
        break
      case "navigation":
        filteredGroups = Array.from(groups).filter(
          ([type]) => type === "pageShortcut" || type === "settingShortcut"
        )
        break
      case "command":
        filteredGroups = Array.from(groups).filter(
          ([type]) => type === "commandShortcut"
        )
        break
      default:
        filteredGroups = []
    }

    return filteredGroups.map(([title, items]) => ({
      title,
      items,
    }))
  }, [globalCommands, currentArea])

  return results
}

const useDynamicSearchResults = (
  currentArea: SearchArea,
  limit: number,
  q?: string
) => {
  const { t } = useTranslation()

  const debouncedSearch = useDebouncedSearch(q, 300)
  const { open } = useSearch()
  const canSearchArea = useSearchAreaAccess()

  const isQueryEnabled = (area: SearchArea) =>
    open && isAreaEnabled(currentArea, area) && canSearchArea(area)

  const orderResponse = useOrders(
    {
      q: debouncedSearch?.replace(/^#/, ""), // Since we display the ID with a # prefix, it's natural for the user to include it in the search. This will however cause no results to be returned, so we remove the # prefix from the search query.
      limit,
      fields: "id,display_id,email",
    },
    {
      enabled: isQueryEnabled("order"),
      placeholderData: keepPreviousData,
    }
  )

  const productResponse = useProducts(
    {
      q: debouncedSearch,
      limit,
      // TODO: Remove exclusion once we avoid including unnecessary relations by default in the query config
      fields:
        "id,title,thumbnail,-type,-collection,-options,-tags,-images,-variants,-sales_channels",
    },
    {
      enabled: isQueryEnabled("product"),
      placeholderData: keepPreviousData,
    }
  )

  const categoryResponse = useProductCategories(
    {
      // TODO: Remove the OR condition once the list endpoint does not throw when q equals an empty string
      q: debouncedSearch || undefined,
      limit,
      fields: "id,name",
    },
    {
      enabled: isQueryEnabled("category"),
      placeholderData: keepPreviousData,
    }
  )

  const collectionResponse = useCollections(
    {
      q: debouncedSearch,
      limit,
      fields: "id,title",
    },
    {
      enabled: isQueryEnabled("collection"),
      placeholderData: keepPreviousData,
    }
  )

  const customerResponse = useCustomers(
    {
      q: debouncedSearch,
      limit,
      fields: "id,email,first_name,last_name",
    },
    {
      enabled: isQueryEnabled("customer"),
      placeholderData: keepPreviousData,
    }
  )

  const inventoryResponse = useInventoryItems(
    {
      q: debouncedSearch,
      limit,
      fields: "id,title,sku",
    },
    {
      enabled: isQueryEnabled("inventory"),
      placeholderData: keepPreviousData,
    }
  )

  const promotionResponse = usePromotions(
    {
      q: debouncedSearch,
      limit,
      fields: "id,code,status",
    },
    {
      enabled: isQueryEnabled("promotion"),
      placeholderData: keepPreviousData,
    }
  )

  const campaignResponse = useCampaigns(
    {
      q: debouncedSearch,
      limit,
      fields: "id,name",
    },
    {
      enabled: isQueryEnabled("campaign"),
      placeholderData: keepPreviousData,
    }
  )

  const priceListResponse = usePriceLists(
    {
      q: debouncedSearch,
      limit,
      fields: "id,title",
    },
    {
      enabled: isQueryEnabled("priceList"),
      placeholderData: keepPreviousData,
    }
  )

  const productTypeResponse = useProductTypes(
    {
      q: debouncedSearch,
      limit,
      fields: "id,value",
    },
    {
      enabled: isQueryEnabled("productType"),
      placeholderData: keepPreviousData,
    }
  )

  const productTagResponse = useProductTags(
    {
      q: debouncedSearch,
      limit,
      fields: "id,value",
    },
    {
      enabled: isQueryEnabled("productTag"),
      placeholderData: keepPreviousData,
    }
  )

  const locationResponse = useStockLocations(
    {
      q: debouncedSearch,
      limit,
      fields: "id,name",
    },
    {
      enabled: isQueryEnabled("location"),
      placeholderData: keepPreviousData,
    }
  )

  const areaResults = useMemo<AreaSearchResults[]>(
    () => [
      {
        area: "order",
        isFetching: orderResponse.isFetching,
        count: orderResponse.count,
        items: orderResponse.orders?.map((order) => ({
          id: order.id,
          title: `#${order.display_id}`,
          subtitle: order.email ?? undefined,
          to: `/orders/${order.id}`,
          value: `order:${order.id}`,
        })),
      },
      {
        area: "product",
        isFetching: productResponse.isFetching,
        count: productResponse.count,
        items: productResponse.products?.map((product) => ({
          id: product.id,
          title: product.title,
          to: `/products/${product.id}`,
          thumbnail: product.thumbnail ?? undefined,
          value: `product:${product.id}`,
        })),
      },
      {
        area: "collection",
        isFetching: collectionResponse.isFetching,
        count: collectionResponse.count,
        items: collectionResponse.collections?.map((collection) => ({
          id: collection.id,
          title: collection.title ?? "",
          to: `/collections/${collection.id}`,
          value: `collection:${collection.id}`,
        })),
      },
      {
        area: "category",
        isFetching: categoryResponse.isFetching,
        count: categoryResponse.count,
        items: categoryResponse.product_categories?.map((category) => ({
          id: category.id,
          title: category.name,
          to: `/categories/${category.id}`,
          value: `category:${category.id}`,
        })),
      },
      {
        area: "inventory",
        isFetching: inventoryResponse.isFetching,
        count: inventoryResponse.count,
        items: inventoryResponse.inventory_items?.map((inventory) => ({
          id: inventory.id,
          title: inventory.title ?? "",
          subtitle: inventory.sku ?? undefined,
          to: `/inventory/${inventory.id}`,
          value: `inventory:${inventory.id}`,
        })),
      },
      {
        area: "customer",
        isFetching: customerResponse.isFetching,
        count: customerResponse.count,
        items: customerResponse.customers?.map((customer) => {
          const name = [customer.first_name, customer.last_name]
            .filter(Boolean)
            .join(" ")
          return {
            id: customer.id,
            title: name || customer.email,
            subtitle: name ? customer.email : undefined,
            to: `/customers/${customer.id}`,
            value: `customer:${customer.id}`,
          }
        }),
      },
      {
        area: "promotion",
        isFetching: promotionResponse.isFetching,
        count: promotionResponse.count,
        items: promotionResponse.promotions?.map((promotion) => ({
          id: promotion.id,
          title: promotion.code ?? "",
          to: `/promotions/${promotion.id}`,
          value: `promotion:${promotion.id}`,
        })),
      },
      {
        area: "campaign",
        isFetching: campaignResponse.isFetching,
        count: campaignResponse.count,
        items: campaignResponse.campaigns?.map((campaign) => ({
          id: campaign.id,
          title: campaign.name ?? "",
          to: `/campaigns/${campaign.id}`,
          value: `campaign:${campaign.id}`,
        })),
      },
      {
        area: "priceList",
        isFetching: priceListResponse.isFetching,
        count: priceListResponse.count,
        items: priceListResponse.price_lists?.map((priceList) => ({
          id: priceList.id,
          title: priceList.title ?? "",
          to: `/price-lists/${priceList.id}`,
          value: `priceList:${priceList.id}`,
        })),
      },
      {
        area: "productType",
        isFetching: productTypeResponse.isFetching,
        count: productTypeResponse.count,
        items: productTypeResponse.product_types?.map((productType) => ({
          id: productType.id,
          title: productType.value,
          to: `/product-types/${productType.id}`,
          value: `productType:${productType.id}`,
        })),
      },
      {
        area: "productTag",
        isFetching: productTagResponse.isFetching,
        count: productTagResponse.count,
        items: productTagResponse.product_tags?.map((productTag) => ({
          id: productTag.id,
          title: productTag.value,
          to: `/product-tags/${productTag.id}`,
          value: `productTag:${productTag.id}`,
        })),
      },
      {
        area: "location",
        isFetching: locationResponse.isFetching,
        count: locationResponse.count,
        items: locationResponse.stock_locations?.map((location) => ({
          id: location.id,
          title: location.name,
          to: `/locations/${location.id}`,
          value: `location:${location.id}`,
        })),
      },
    ],
    [
      orderResponse,
      productResponse,
      inventoryResponse,
      categoryResponse,
      collectionResponse,
      customerResponse,
      promotionResponse,
      campaignResponse,
      priceListResponse,
      productTypeResponse,
      productTagResponse,
      locationResponse,
    ]
  )

  const results = useMemo(
    () =>
      areaResults.flatMap(({ area, count, items }): DynamicSearchResult[] => {
        if (
          !items ||
          !canSearchArea(area) ||
          !(isAreaEnabled(currentArea, area) || currentArea === "all")
        ) {
          return []
        }

        const total = count ?? 0

        return [
          {
            title: t(`app.search.groups.${area}`),
            area,
            hasMore: total > limit,
            count: total,
            items,
          },
        ]
      }),
    [areaResults, currentArea, limit, t, canSearchArea]
  )

  const isAreaFetching = useCallback(
    (area: SearchArea): boolean => {
      if (area === "all") {
        return areaResults.some((result) => result.isFetching)
      }

      return (
        isAreaEnabled(currentArea, area) &&
        areaResults.some(
          (result) => result.area === area && result.isFetching
        )
      )
    },
    [currentArea, areaResults]
  )

  const isFetching = useMemo(() => {
    return isAreaFetching(currentArea)
  }, [currentArea, isAreaFetching])

  const dynamicResults = q
    ? results.filter((group) => group.items.length > 0)
    : []

  return {
    dynamicResults,
    isFetching,
  }
}

const useDebouncedSearch = (value: string | undefined, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

function isAreaEnabled(area: SearchArea, currentArea: SearchArea) {
  if (area === "all") {
    return true
  }
  if (area === currentArea) {
    return true
  }
  return false
}

/**
 * One searchable area's response, reduced to the list items it renders.
 * `items` is undefined until the area's query has returned data.
 */
type AreaSearchResults = {
  area: SearchArea
  isFetching: boolean
  count?: number
  items?: DynamicSearchResultItem[]
}
