import { useEffect, useRef, useState } from "react"

import {
  ArrowUturnLeft,
  TriangleRightMini,
  TrianglesMini,
  XMarkMini,
} from "@medusajs/icons"
import type { AdminProductCategory } from "@medusajs/types"
import { Badge, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

type MultiSelectCategoryProps = {
  categories: AdminProductCategory[]
  value: string[]
  onChange: (value: string[]) => void
}

export const MultiSelectCategory = ({
  categories,
  value,
  onChange,
}: MultiSelectCategoryProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [currentParentId, setCurrentParentId] = useState<string | null>(null)
  const [pathHistory, setPathHistory] = useState<(string | null)[]>([])

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

  const handleToggle = () => {
    setIsOpen((prev) => !prev)
  }

  const hasChildren = (categoryId: string) => {
    return categories.some((cat) => cat.parent_category_id === categoryId)
  }

  const handleDrillDown = (category: AdminProductCategory) => {
    setPathHistory([...pathHistory, currentParentId])
    setCurrentParentId(category.id)
  }

  const handleGoBack = () => {
    const newPathHistory = [...pathHistory]
    const previousParentId = newPathHistory.pop()
    setPathHistory(newPathHistory)
    setCurrentParentId(previousParentId || null)
  }

  const handleItemClick = (categoryId: string) => {
    const isSelected = value.includes(categoryId)
    if (isSelected) {
      onChange(value.filter((id) => id !== categoryId))
    } else {
      onChange([...value, categoryId])
    }
  }

  const currentCategories = categories.filter(
    (cat) => cat.parent_category_id === currentParentId
  )

  const getBackButtonText = (): string => {
    const parentCategory = categories.find((cat) => cat.id === currentParentId)
    return parentCategory?.name || ""
  }

  return (
    <div
      className="relative"
      data-testid="attribute-form-category-multiselect"
    >
      <div
        ref={triggerRef}
        className="focus-within:ring-ui-ring-interactive relative flex h-10 w-full items-center justify-between overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-field text-ui-fg-base shadow-sm transition-colors duration-150 ease-in-out focus-within:border-ui-border-interactive focus-within:ring-1 hover:bg-ui-bg-field-hover"
      >
        <button
          type="button"
          className="absolute inset-0 cursor-pointer outline-none"
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-label={t("attributes.selectCategory.placeholder")}
          data-testid="attribute-form-category-multiselect-trigger"
        />
        <div
          className="pointer-events-none relative flex items-center gap-2 px-3 py-2"
          data-testid="attribute-form-category-multiselect-trigger-content"
        >
          {value.length > 0 ? (
            <button
              type="button"
              className="pointer-events-auto"
              onClick={() => onChange([])}
              aria-label={t("actions.clearAll")}
              data-testid="attribute-form-category-multiselect-clear-button"
            >
              <Badge
                size="small"
                className="w-fit"
                data-testid="attribute-form-category-multiselect-badge"
              >
                {value.length}
                <XMarkMini />
              </Badge>
            </button>
          ) : (
            <Text
              className="text-ui-fg-subtle"
              data-testid="attribute-form-category-multiselect-placeholder"
            >
              {t("attributes.selectCategory.placeholder")}
            </Text>
          )}
        </div>
        <span
          className="pointer-events-none relative flex h-full w-10 items-center justify-center border-s border-ui-border-base"
          data-testid="attribute-form-category-multiselect-icon"
        >
          <TrianglesMini />
        </span>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-ui-border-base bg-ui-bg-base shadow-lg"
          data-testid="attribute-form-category-multiselect-dropdown"
        >
          {currentParentId !== null && (
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-3 border-b border-ui-border-base px-3 py-2 text-start text-ui-fg-subtle outline-none hover:bg-ui-bg-base-hover focus-visible:bg-ui-bg-base-hover"
              onClick={handleGoBack}
              data-testid="attribute-form-category-multiselect-back-button"
            >
              <ArrowUturnLeft />
              <span className="sr-only">{t("actions.back")}</span>
              <Text data-testid="attribute-form-category-multiselect-back-text">
                {getBackButtonText()}
              </Text>
            </button>
          )}
          {currentCategories.length === 0 ? (
            <div
              className="p-3 text-ui-fg-subtle"
              data-testid="attribute-form-category-multiselect-empty"
            >
              {t("general.noResultsTitle")}
            </div>
          ) : (
            currentCategories.map((category) => {
              const isSelected = value.includes(category.id)
              const hasChildrenNode = hasChildren(category.id)
              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between px-1 py-1"
                  data-testid={`attribute-form-category-multiselect-item-${category.id}`}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleItemClick(category.id)}
                    className="relative me-2 flex flex-1 cursor-pointer items-center rounded-md px-2 py-1.5 text-start outline-none hover:bg-ui-bg-base-hover focus-visible:bg-ui-bg-base-hover"
                    data-testid={`attribute-form-category-multiselect-item-${category.id}-content`}
                  >
                    {isSelected && (
                      <span
                        className="absolute start-3 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-ui-fg-base"
                        data-testid={`attribute-form-category-multiselect-item-${category.id}-selected-indicator`}
                      />
                    )}
                    <Text
                      className="ms-6"
                      data-testid={`attribute-form-category-multiselect-item-${category.id}-name`}
                    >
                      {category.name}
                    </Text>
                  </button>
                  {hasChildrenNode && (
                    <button
                      type="button"
                      onClick={() => handleDrillDown(category)}
                      aria-label={t("categories.fields.children.label")}
                      className="rounded-md p-2 outline-none hover:bg-ui-bg-base-hover focus-visible:bg-ui-bg-base-hover"
                      data-testid={`attribute-form-category-multiselect-item-${category.id}-drill-down`}
                    >
                      <TriangleRightMini className="me-1 rtl:rotate-180" />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
