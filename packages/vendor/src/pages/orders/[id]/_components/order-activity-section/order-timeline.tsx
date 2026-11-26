import { withContentKeys } from "@mercurjs/dashboard-shared"
import { HttpTypes } from "@mercurjs/types"
import { getActivityContentKey, useActivityItems } from "./hooks"
import { OrderActivityItem, OrderActivityCollapsible } from "./components"

type OrderTimelineProps = {
  order: HttpTypes.VendorOrder
}

export const OrderTimeline = ({ order }: OrderTimelineProps) => {
  const items = useActivityItems(order)

  if (items.length <= 3) {
    return (
      <div className="flex flex-col gap-y-0.5">
        {withContentKeys(items, getActivityContentKey).map(({ key, item }, index) => {
          return (
            <OrderActivityItem
              key={key}
              title={item.title}
              timestamp={item.timestamp}
              isFirst={index === items.length - 1}
              itemsToSend={item.itemsToSend}
              itemsToReturn={item.itemsToReturn}
              itemsMap={item.itemsMap}
            >
              {item.children}
            </OrderActivityItem>
          )
        })}
      </div>
    )
  }

  const lastItems = items.slice(0, 2)
  const collapsibleItems = items.slice(2, items.length - 1)
  const firstItem = items[items.length - 1]

  return (
    <div className="flex flex-col gap-y-0.5">
      {withContentKeys(lastItems, getActivityContentKey).map(({ key, item }) => {
        return (
          <OrderActivityItem
            key={key}
            title={item.title}
            timestamp={item.timestamp}
            itemsToSend={item.itemsToSend}
            itemsToReturn={item.itemsToReturn}
            itemsMap={item.itemsMap}
          >
            {item.children}
          </OrderActivityItem>
        )
      })}
      <OrderActivityCollapsible activities={collapsibleItems} />
      <OrderActivityItem
        title={firstItem.title}
        timestamp={firstItem.timestamp}
        isFirst
        itemsToSend={firstItem.itemsToSend}
        itemsToReturn={firstItem.itemsToReturn}
        itemsMap={firstItem.itemsMap}
      >
        {firstItem.children}
      </OrderActivityItem>
    </div>
  )
}
