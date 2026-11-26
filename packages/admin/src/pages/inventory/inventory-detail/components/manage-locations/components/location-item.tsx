import { Checkbox, Text, clx } from "@medusajs/ui"
import { useId } from "react"

import { HttpTypes } from "@medusajs/types"

type LocationItemProps = {
  selected: boolean
  disabled?: boolean
  onSelect: (selected: boolean) => void
  location: HttpTypes.AdminStockLocation
}

export const LocationItem = ({
  selected,
  disabled = false,
  onSelect,
  location,
}: LocationItemProps) => {
  const checkboxId = useId()
  const toggle = (): void => {
    if (!disabled) {
      onSelect(!selected)
    }
  }

  return (
    <label
      htmlFor={checkboxId}
      aria-disabled={disabled}
      className={clx(
        "flex w-full gap-x-2 rounded-lg border px-2 py-2",
        {
          "border-ui-border-interactive ": selected,
          "cursor-pointer": !disabled,
          "cursor-not-allowed opacity-50": disabled,
        }
      )}
      data-testid={`inventory-manage-locations-form-location-item-${location.id}`}
    >
      <span className="block h-5 w-5" data-testid={`inventory-manage-locations-form-location-item-${location.id}-checkbox-container`}>
        <Checkbox
          id={checkboxId}
          onCheckedChange={toggle}
          checked={selected}
          disabled={disabled}
          data-testid={`inventory-manage-locations-form-location-item-${location.id}-checkbox`}
        />
      </span>
      <span className="flex w-full flex-col" data-testid={`inventory-manage-locations-form-location-item-${location.id}-details`}>
        <Text as="span" size="small" leading="compact" weight="plus" data-testid={`inventory-manage-locations-form-location-item-${location.id}-name`}>
          {location.name}
        </Text>
        <Text as="span" size="small" leading="compact" className="text-ui-fg-subtle" data-testid={`inventory-manage-locations-form-location-item-${location.id}-address`}>
          {[
            location.address?.address_1,
            location.address?.city,
            location.address?.country_code,
          ]
            .filter((el) => !!el)
            .join(", ")}
        </Text>
      </span>
    </label>
  )
}
