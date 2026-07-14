import { HttpTypes } from "@medusajs/types"
import { Input } from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import {
  createDataGridHelper,
  createDataGridLocationStockColumns,
  createDataGridPriceColumns,
  DataGrid,
} from "@components/data-grid"
import { useRouteModal, useStackedModal } from "@components/modals"
import { useTabbedForm } from "@components/tabbed-form/tabbed-form"
import { defineTabMeta } from "@components/tabbed-form/types"
import {
  useCurrentSeller,
  useRegions,
  useShippingProfiles,
  useStockLocations,
} from "@hooks/api"
import { usePricePreferences } from "@hooks/api/price-preferences"

import { ProductCreateVariantSchema } from "../../constants"
import { ProductCreateSchemaType } from "../../types"
import { generateVariantSku } from "../../utils"
import {
  ProductCreateVariantMediaDrawer,
  VARIANT_MEDIA_DRAWER_ID,
} from "./product-create-variant-media-drawer"

type ShippingProfileLite = { id: string; name?: string | null }

const Root = () => {
  const { t } = useTranslation()
  const form = useTabbedForm<ProductCreateSchemaType>()
  const { setCloseOnEscape } = useRouteModal()
  const { setIsOpen: setStackedModalOpen } = useStackedModal()

  const [search, setSearch] = useState("")
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(
    null
  )

  const openMediaPicker = useCallback(
    (index: number) => {
      setActiveMediaIndex(index)
      setStackedModalOpen(VARIANT_MEDIA_DRAWER_ID, true)
    },
    [setStackedModalOpen]
  )

  const { regions } = useRegions({ limit: 9999 })
  const { stock_locations } = useStockLocations({ limit: 100 })
  const { shipping_profiles } = useShippingProfiles({ limit: 100 }) as {
    shipping_profiles?: ShippingProfileLite[]
  }
  const { price_preferences: pricePreferences } = usePricePreferences({})
  const { seller } = useCurrentSeller()

  // Mirrors `@mercurjs/admin`'s own product-create-variants-form: price
  // columns cover every currency the marketplace actually sells in (one per
  // region), not just the seller's own onboarding currency — a seller's
  // catalog should be priceable in any region/currency the platform
  // supports, not only their reporting currency.
  const currencies = useMemo(() => {
    return Array.from(
      new Set((regions ?? []).map((region) => region.currency_code))
    )
  }, [regions])

  const variants = useWatch({
    control: form.control,
    name: "variants",
    defaultValue: [],
  })

  // The stock-toggle cell reads `inventory[locationId]` as an object
  // ({checked, quantity, disabledToggle}) — a variant row with no entry yet
  // for a given location renders `undefined` there and crashes. Seed every
  // known location into every row (without touching values already set).
  useEffect(() => {
    if (!stock_locations?.length) return

    const current = form.getValues("variants") ?? []
    let changed = false

    const next = current.map((variant) => {
      const inventory = { ...(variant.inventory ?? {}) }
      for (const location of stock_locations) {
        if (!inventory[location.id]) {
          inventory[location.id] = {
            checked: false,
            quantity: "",
            disabledToggle: false,
          }
          changed = true
        }
      }
      return { ...variant, inventory }
    })

    if (changed) {
      form.setValue("variants", next, { shouldDirty: false })
    }
  }, [stock_locations, variants.length, form])

  const productTitle = useWatch({
    control: form.control,
    name: "title",
    defaultValue: "",
  })

  // Title is permanently read-only in the grid (see the "title" column
  // below), so there is no seller-edited value to preserve — the axis-less
  // default variant's title unconditionally tracks the product title, and
  // axis-based variants keep the option-combo title `generateVariantsFromAttributes`
  // already gives them.
  useEffect(() => {
    const trimmedTitle = productTitle.trim()
    if (!trimmedTitle) return

    const current = form.getValues("variants") ?? []
    let changed = false

    const next = current.map((variant) => {
      const hasOptions = !!variant.options && Object.keys(variant.options).length > 0

      if (hasOptions || variant.title === trimmedTitle) {
        return variant
      }

      changed = true
      return { ...variant, title: trimmedTitle }
    })

    if (changed) {
      form.setValue("variants", next, { shouldDirty: false })
    }
  }, [productTitle, variants.length, form])

  // SKU is store-only, generated once per row, and read-only in the grid —
  // there is nothing for the seller to edit, so this only ever fills in a
  // still-empty `sku` (a brand-new variant row) and never overwrites one
  // that already has a value.
  useEffect(() => {
    if (!seller) return

    const current = form.getValues("variants") ?? []
    let changed = false

    const next = current.map((variant) => {
      if (variant.sku) {
        return variant
      }

      changed = true
      return { ...variant, sku: generateVariantSku(seller) }
    })

    if (changed) {
      form.setValue("variants", next, { shouldDirty: false })
    }
  }, [seller, variants.length, form])

  const watchedMedia = useWatch({
    control: form.control,
    name: "media",
    defaultValue: [],
  })

  // Görsel column selections reference the product's own `media` entries by
  // `id`. If a photo is removed from the Detaylar tab after being assigned
  // to a variant, drop the same id from every variant's selection so a
  // stale reference never survives to submit.
  useEffect(() => {
    const validIds = new Set(
      (watchedMedia ?? [])
        .map((media) => media.id)
        .filter((id): id is string => !!id)
    )

    const current = form.getValues("variants") ?? []
    let changed = false

    const next = current.map((variant) => {
      const media = variant.media ?? []
      if (media.length === 0) return variant

      const filtered = media.filter((m) => !!m.id && validIds.has(m.id))
      if (filtered.length === media.length) return variant

      changed = true
      return { ...variant, media: filtered }
    })

    if (changed) {
      form.setValue("variants", next, { shouldDirty: false })
    }
  }, [watchedMedia, form])

  const watchedAttributes = useWatch({
    control: form.control,
    name: "attributes",
    defaultValue: [],
  })

  const variantAxes = useMemo(() => {
    return (watchedAttributes ?? [])
      .filter((attr) => attr.use_for_variants && attr.title)
      .map((attr) => ({
        title: attr.title,
      }))
  }, [watchedAttributes])

  const columns = useColumns({
    variantAxes,
    currencies,
    stockLocations: stock_locations as
      | HttpTypes.AdminStockLocation[]
      | undefined,
    shippingProfiles: shipping_profiles ?? [],
    pricePreferences,
    onOpenMediaPicker: openMediaPicker,
  })

  const variantData = useMemo(() => {
    const ret: (ProductCreateVariantSchema & { originalIndex: number })[] = []

    variants.forEach((v, i) => {
      if (v.should_create) {
        ret.push({ ...v, originalIndex: i })
      }
    })

    return ret
  }, [variants])

  const filteredVariantData = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return variantData
    }

    return variantData.filter((variant) => {
      const haystack = [
        variant.title,
        variant.sku,
        ...Object.values(variant.options ?? {}),
      ]

      return haystack.some((value) => value?.toLowerCase().includes(query))
    })
  }, [variantData, search])

  const headerContent = (
    <Input
      type="search"
      size="small"
      autoComplete="off"
      value={search}
      onChange={(event) => setSearch(event.target.value)}
      placeholder={t(
        "products.create.variants.productVariants.searchPlaceholder"
      )}
      data-testid="product-create-variants-search-input"
    />
  )

  return (
    <div
      className="flex size-full flex-col divide-y overflow-hidden"
      data-testid="product-create-variants-form"
    >
      <ProductCreateVariantMediaDrawer activeIndex={activeMediaIndex} />
      <div
        className="min-h-0 flex-1 overflow-hidden"
        data-testid="product-create-variants-form-datagrid"
      >
        <DataGrid
          columns={columns}
          data={filteredVariantData}
          state={form}
          onEditingChange={(editing) => setCloseOnEscape(!editing)}
          headerContent={headerContent}
        />
      </div>
    </div>
  )
}

Root._tabMeta = defineTabMeta<ProductCreateSchemaType>({
  id: "variants",
  labelKey: "products.create.tabs.variants",
  validationFields: ["variants"],
})

export const ProductCreateVariantsForm = Root

type VariantRow = ProductCreateVariantSchema & { originalIndex: number }

const columnHelper = createDataGridHelper<VariantRow, ProductCreateSchemaType>()

type ColumnArgs = {
  variantAxes: { title: string }[]
  currencies?: string[]
  stockLocations?: HttpTypes.AdminStockLocation[]
  shippingProfiles?: ShippingProfileLite[]
  pricePreferences?: HttpTypes.AdminPricePreference[]
  onOpenMediaPicker: (index: number) => void
}

const useColumns = ({
  variantAxes,
  currencies = [],
  stockLocations = [],
  shippingProfiles = [],
  pricePreferences = [],
  onOpenMediaPicker,
}: ColumnArgs) => {
  const { t } = useTranslation()

  return useMemo(() => {
    const shippingProfileOptions = shippingProfiles.map((p) => ({
      value: p.id,
      label: p.name ?? p.id,
    }))

    return [
      columnHelper.column({
        id: "attributes",
        header: () => (
          <div className="flex size-full items-center overflow-hidden">
            <span className="truncate">
              {variantAxes.map((a) => a.title).join(" / ")}
            </span>
          </div>
        ),
        cell: (context) => {
          return (
            <DataGrid.ReadonlyCell context={context}>
              {variantAxes
                .map((a) => context.row.original.options?.[a.title])
                .join(" / ")}
            </DataGrid.ReadonlyCell>
          )
        },
        disableHiding: true,
      }),
      columnHelper.column({
        id: "title",
        name: t("fields.title"),
        header: t("fields.title"),
        // Always auto-derived (product title for the axis-less default
        // variant, option combo for axis-based variants) — permanently
        // read-only, sellers never edit this field directly.
        cell: (context) => {
          return (
            <DataGrid.ReadonlyCell context={context}>
              {context.row.original.title}
            </DataGrid.ReadonlyCell>
          )
        },
      }),
      columnHelper.column({
        id: "sku",
        name: t("fields.sku"),
        header: t("fields.sku"),
        // Store-only, auto-generated, and permanently read-only — sellers
        // never edit this field, so it isn't wired to a form `field` path.
        cell: (context) => {
          return (
            <DataGrid.ReadonlyCell context={context}>
              {context.row.original.sku}
            </DataGrid.ReadonlyCell>
          )
        },
      }),
      columnHelper.column({
        id: "shipping_profile",
        name: t("products.fields.shipping_profile.label"),
        header: t("products.fields.shipping_profile.label"),
        // Shipping profile is a product-level field, not per-variant — every
        // row edits the same `shipping_profile_id` so the value stays in
        // sync across the whole grid.
        field: () => "shipping_profile_id",
        type: "select",
        cell: (context) => (
          <DataGrid.SelectCell
            context={context}
            options={shippingProfileOptions}
            placeholder=""
          />
        ),
      }),
      // Only shown once the product actually has variant axes — a
      // single-variant (basit) product's grid stays pixel-identical to
      // today's, no Görsel column at all.
      ...(variantAxes.length > 0
        ? [
            columnHelper.column({
              id: "media",
              name: t("products.create.variants.productVariants.media"),
              header: t("products.create.variants.productVariants.media"),
              field: (context) =>
                `variants.${context.row.original.originalIndex}.media`,
              type: "select",
              cell: (context) => (
                <DataGrid.MediaCell
                  context={context}
                  onOpenMediaModal={() =>
                    onOpenMediaPicker(context.row.original.originalIndex)
                  }
                />
              ),
            }),
          ]
        : []),
      ...createDataGridLocationStockColumns<VariantRow, ProductCreateSchemaType>({
        stockLocations,
        getFieldName: (context, index) => {
          const location = stockLocations[index]
          if (!location) return null
          return `variants.${context.row.original.originalIndex}.inventory.${location.id}`
        },
        t,
      }),
      ...createDataGridPriceColumns<VariantRow, ProductCreateSchemaType>({
        currencies,
        pricePreferences,
        getFieldName: (context, value) => {
          if (context.column.id?.startsWith("currency_prices")) {
            return `variants.${context.row.original.originalIndex}.prices.${value}`
          }
          return null
        },
        t,
      }),
    ]
  }, [
    variantAxes,
    t,
    currencies,
    stockLocations,
    shippingProfiles,
    pricePreferences,
    onOpenMediaPicker,
  ])
}
