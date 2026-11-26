import { Checkbox, Text, clx } from "@medusajs/ui"
import { useId } from "react"

import { StockLocationDTO } from "@medusajs/types"

type LocationItemProps = {
  selected: boolean
  onSelect: (selected: boolean) => void
  location: StockLocationDTO
}

export const LocationItem = ({
  selected,
  onSelect,
  location,
}: LocationItemProps) => {
  const checkboxId = useId()
  return (
    <label
      htmlFor={checkboxId}
      className={clx(
        "flex w-full cursor-pointer gap-x-2 rounded-lg border px-2 py-2",
        {
          "border-ui-border-interactive ": selected,
        }
      )}
    >
      <span className="block h-5 w-5">
        <Checkbox
          id={checkboxId}
          onCheckedChange={() => onSelect(!selected)}
          checked={selected}
        />
      </span>
      <span className="flex w-full flex-col">
        <Text as="span" size="small" leading="compact" weight="plus">
          {location.name}
        </Text>
        <Text
          as="span"
          size="small"
          leading="compact"
          className="text-ui-fg-subtle"
        >
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
