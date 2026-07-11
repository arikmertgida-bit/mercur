import { Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

// `AdminOrderFulfillment` (the order module's embedded fulfillment shape)
// doesn't declare `items`, but the order detail query expands it at
// runtime — accept the minimal shape this component actually reads instead
// of the fulfillment module's own `AdminFulfillment`, which doesn't
// structurally match what callers have on hand here.
type FulfillmentWithItems = {
  items?: { quantity?: number | null }[] | null
}

type FulfillmentCreatedBodyProps = {
  fulfillment: FulfillmentWithItems
  isShipment?: boolean
}

export const FulfillmentCreatedBody = ({
  fulfillment,
}: FulfillmentCreatedBodyProps) => {
  const { t } = useTranslation()

  const numberOfItems = (fulfillment.items || []).reduce((acc, item) => {
    return acc + (item.quantity || 0)
  }, 0)

  return (
    <div>
      <Text size="small" className="text-ui-fg-subtle">
        {t("orders.activity.events.fulfillment.items", {
          count: numberOfItems,
        })}
      </Text>
    </div>
  )
}

