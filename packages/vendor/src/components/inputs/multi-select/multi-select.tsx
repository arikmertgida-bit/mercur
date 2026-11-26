import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { CheckMini, TrianglesMini, XMarkMini } from "@medusajs/icons"
import { Badge, Input, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

type MultiSelectOption = {
  value: string
  label: string
}

type MultiSelectProps = {
  options: MultiSelectOption[]
  value: string[] | undefined
  onChange: (value: string[]) => void
  onBlur?: () => void
  name?: string
  placeholder?: string
  "aria-invalid"?: boolean
  disabled?: boolean
  className?: string
  showSearch?: boolean
}

const MultiSelect = forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      options,
      value,
      onChange,
      onBlur,
      name,
      placeholder,
      "aria-invalid": ariaInvalid = false,
      disabled = false,
      className = "",
      showSearch = true,
    },
    ref
  ) => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [searchValue, setSearchValue] = useState("")
    const dropdownRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLDivElement>(null)
    const badgesContainerRef = useRef<HTMLDivElement>(null)
    const [visibleBadgesCount, setVisibleBadgesCount] = useState(0)

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target

        if (
          target instanceof Node &&
          dropdownRef.current &&
          !dropdownRef.current.contains(target) &&
          triggerRef.current &&
          !triggerRef.current.contains(target)
        ) {
          setIsOpen(false)
        }
      }
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }, [])

    const fallbackLabel = t("general.notAvailable")

    const calculateVisibleBadges = useCallback(() => {
      if (!value || value.length === 0 || !badgesContainerRef.current) {
        setVisibleBadgesCount(0)
        return
      }

      const container = badgesContainerRef.current
      const containerWidth = container.offsetWidth
      const padding = 24
      const gap = 8
      const availableWidth = containerWidth - padding

      const estimateBadgeWidth = (label: string) => {
        const baseWidth = 32
        const charWidth = 8
        return baseWidth + label.length * charWidth
      }

      let totalWidth = 0
      let count = 0

      for (let i = 0; i < value.length; i++) {
        const option = options.find((opt) => opt.value === value[i])
        const optionLabel = option?.label || fallbackLabel
        const badgeWidth =
          estimateBadgeWidth(optionLabel) > 200
            ? 235
            : estimateBadgeWidth(optionLabel)

        if (
          totalWidth + badgeWidth + (count > 0 ? gap : 0) <=
          availableWidth
        ) {
          totalWidth += badgeWidth + (count > 0 ? gap : 0)
          count++
        } else {
          break
        }
      }

      setVisibleBadgesCount(count)
    }, [value, options, fallbackLabel])

    useEffect(() => {
      calculateVisibleBadges()
    }, [calculateVisibleBadges])

    useEffect(() => {
      const resizeObserver = new ResizeObserver(() => {
        calculateVisibleBadges()
      })

      if (badgesContainerRef.current) {
        resizeObserver.observe(badgesContainerRef.current)
      }

      return () => {
        resizeObserver.disconnect()
      }
    }, [calculateVisibleBadges])

    const handleToggle = () => {
      if (disabled) return
      setIsOpen((prev) => !prev)
      if (!isOpen && showSearch) {
        setSearchValue("")
      }
    }

    const handleItemClick = (optionValue: string) => {
      const currentValue = value || []
      const isSelected = currentValue.includes(optionValue)
      if (isSelected) {
        onChange(currentValue.filter((val) => val !== optionValue))
      } else {
        onChange([...currentValue, optionValue])
      }
    }

    const handleRemoveBadge = (optionValue: string) => {
      const currentValue = value || []
      onChange(currentValue.filter((val) => val !== optionValue))
    }

    const filteredOptions = useMemo(() => {
      if (!showSearch || !searchValue.trim()) {
        return options
      }
      return options.filter((option) =>
        option.label.toLowerCase().includes(searchValue.toLowerCase())
      )
    }, [options, searchValue, showSearch])

    const handleSearchChange = (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      setSearchValue(e.target.value)
    }

    const handleClearSearch = () => {
      setSearchValue("")
    }

    return (
      <div ref={ref} className={`relative ${className}`}>
        <div
          ref={triggerRef}
          className={`relative flex h-8 w-full items-center justify-between overflow-hidden rounded-md border bg-ui-bg-field text-ui-fg-base shadow-sm transition-colors duration-150 ease-in-out focus-within:ring-1 hover:bg-ui-bg-field-hover ${
            disabled
              ? "cursor-not-allowed bg-ui-bg-disabled opacity-50"
              : ariaInvalid
                ? "!shadow-borders-error"
                : "focus-within:ring-ui-ring-interactive border-ui-border-base focus-within:border-ui-border-interactive"
          }`}
          onBlur={onBlur}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-pointer outline-none disabled:cursor-not-allowed"
            onClick={handleToggle}
            disabled={disabled}
            aria-expanded={isOpen}
            aria-label={placeholder || name || t("general.selectValues")}
          />
          <div
            ref={badgesContainerRef}
            className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-2 px-3 py-2"
          >
            {value && value.length > 0 ? (
              <>
                {value
                  .slice(0, visibleBadgesCount)
                  .map((optionValue) => {
                    const option = options.find(
                      (opt) => opt.value === optionValue
                    )
                    const optionLabel = option?.label || fallbackLabel
                    return (
                      <button
                        key={optionValue}
                        type="button"
                        onClick={() => handleRemoveBadge(optionValue)}
                        className="pointer-events-auto flex flex-shrink-0 items-center self-center"
                        disabled={disabled}
                        aria-label={`${t("actions.remove")}: ${optionLabel}`}
                      >
                        <Badge
                          size="2xsmall"
                          className="w-fit bg-ui-bg-base p-0"
                        >
                          <span className="max-w-[200px] truncate text-ellipsis border-e border-ui-border-base px-1.5">
                            {optionLabel}
                          </span>
                          <XMarkMini className="me-0.5 !text-ui-fg-base" />
                        </Badge>
                      </button>
                    )
                  })}
                {value && value.length > visibleBadgesCount && (
                  <Badge
                    size="small"
                    className="txt-compact-small-plus w-fit flex-shrink-0 border-none bg-transparent px-0 text-ui-fg-subtle"
                  >
                    +{value.length - visibleBadgesCount}
                  </Badge>
                )}
              </>
            ) : (
              <Text className="text-ui-fg-subtle">
                {placeholder || t("general.selectValues")}
              </Text>
            )}
          </div>
          <div className="pointer-events-none relative flex h-full items-center justify-center">
            <span className="flex h-full w-8 items-center justify-center">
              <TrianglesMini className="text-ui-fg-muted" />
            </span>
          </div>
        </div>

        {isOpen && !disabled && (
          <div
            ref={dropdownRef}
            className="absolute z-10 mt-1 max-h-60 w-full overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base shadow-lg"
          >
            {showSearch && (
              <div className="sticky top-0 z-10 border-b border-ui-border-base bg-ui-bg-base p-2">
                <div className="relative">
                  <Input
                    value={searchValue}
                    onChange={handleSearchChange}
                    placeholder={t("general.searchOptions")}
                    aria-label={t("general.searchOptions")}
                    className="w-full bg-transparent pe-8 shadow-none focus:!shadow-none"
                  />
                  {searchValue && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors hover:bg-ui-bg-base-hover"
                      aria-label={t("actions.clearSearch")}
                    >
                      <XMarkMini className="h-4 w-4 text-ui-fg-muted" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div
              className={`${showSearch ? "max-h-48" : "max-h-60"} overflow-y-auto py-1`}
            >
              {filteredOptions.length === 0 ? (
                <div className="txt-compact-small-plus p-3 text-ui-fg-subtle">
                  {showSearch && searchValue.trim()
                    ? t("general.noOptionsFound")
                    : t("general.noOptionsAvailable")}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const currentValue = value || []
                  const isSelected = currentValue.includes(option.value)
                  return (
                    <button
                      type="button"
                      key={option.value}
                      aria-pressed={isSelected}
                      aria-label={option.label}
                      className="flex w-full cursor-pointer items-center px-1 py-1 text-start outline-none hover:bg-ui-bg-base-hover focus-visible:bg-ui-bg-base-hover"
                      onClick={() => handleItemClick(option.value)}
                    >
                      <div className="flex flex-1 items-center gap-x-2 rounded-md px-2">
                        <div className="flex size-5 shrink-0 items-center justify-center">
                          {isSelected && <CheckMini />}
                        </div>
                        <Text className="truncate">{option.label}</Text>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
)

MultiSelect.displayName = "MultiSelect"

export default MultiSelect
export type { MultiSelectProps, MultiSelectOption }
