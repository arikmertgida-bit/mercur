import { Input, Label, clx } from "@medusajs/ui"
import { Popover as RadixPopover } from "radix-ui"
import { ChangeEvent, useRef, useState } from "react"
import { useDebouncedAction } from "@mercurjs/dashboard-shared"
import { useSelectedParams } from "../hooks"
import { useDataTableFilterContext } from "./context"
import FilterChip from "./filter-chip"
import { IFilter } from "./types"

type StringFilterProps = IFilter

export const StringFilter = ({
  filter,
  prefix,
  readonly,
  openOnMount,
}: StringFilterProps) => {
  const [open, setOpen] = useState(openOnMount)

  const { key, label } = filter

  const { removeFilter } = useDataTableFilterContext()
  const selectedParams = useSelectedParams({ param: key, prefix })

  const query = selectedParams.get()

  const [previousValue, setPreviousValue] = useState<string | undefined>(
    query?.[0]
  )

  const debounceChange = useDebouncedAction(500)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    debounceChange(() => {
      if (!value) {
        selectedParams.delete()
      } else {
        selectedParams.add(value)
      }
    })
  }

  const removeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleOpenChange = (open: boolean) => {
    setOpen(open)
    setPreviousValue(query?.[0])

    if (removeTimeoutRef.current) {
      clearTimeout(removeTimeoutRef.current)
      removeTimeoutRef.current = null
    }

    if (!open && !query.length) {
      removeTimeoutRef.current = setTimeout(() => {
        removeFilter(key)
      }, 200)
    }
  }

  const handleRemove = () => {
    selectedParams.delete()
    removeFilter(key)
  }

  return (
    <RadixPopover.Root modal open={open} onOpenChange={handleOpenChange}>
      <FilterChip
        hasOperator
        hadPreviousValue={!!previousValue}
        label={label}
        value={query?.[0]}
        onRemove={handleRemove}
        readonly={readonly}
      />
      {!readonly && (
        <RadixPopover.Portal>
          <RadixPopover.Content
            hideWhenDetached
            align="start"
            sideOffset={8}
            collisionPadding={8}
            className={clx(
              "bg-ui-bg-base text-ui-fg-base shadow-elevation-flyout z-[1] h-full max-h-[200px] w-[300px] overflow-hidden rounded-lg outline-none"
            )}
            onInteractOutside={(e) => {
              if (e.target instanceof HTMLElement) {
                if (
                  e.target.attributes.getNamedItem("data-name")?.value ===
                  "filters_menu_content"
                ) {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }
            }}
          >
            <div className="px-1 pb-3 pt-1">
              <div className="px-2 py-1.5">
                <Label size="xsmall" weight="plus" htmlFor={key}>
                  {label}
                </Label>
              </div>
              <div className="px-2 py-0.5">
                <Input
                  name={key}
                  size="small"
                  defaultValue={query?.[0] || undefined}
                  onChange={handleChange}
                />
              </div>
            </div>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      )}
    </RadixPopover.Root>
  )
}
