import { HttpTypes } from "@medusajs/types"
import { usePermissionGate } from "@mercurjs/dashboard-shared"
import { ConditionalTooltip } from "@components/common/conditional-tooltip"
import { Button, Heading, Text, toast } from "@medusajs/ui"
import { useEffect, useMemo } from "react"
import { useFieldArray, UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "@components/common/form"
import { Combobox, getSingleComboboxValue } from "@components/inputs/combobox"
import {
  RouteFocusModal,
  StackedFocusModal,
  useStackedModal,
} from "@components/modals"
import {
  useAddExchangeInboundItems,
  useAddExchangeInboundShipping,
  useRemoveExchangeInboundItem,
  useUpdateExchangeInboundItem,
} from "@hooks/api/exchanges"
import { useShippingOptions } from "@hooks/api/shipping-options"
import { useStockLocations } from "@hooks/api/stock-locations"

import { AddExchangeInboundItemsTable } from "../add-exchange-inbound-items-table"
import { ItemPlaceholder } from "../../../../claims/create/_components/claim-create-form/item-placeholder"
import {
  ExchangeInboundItem,
  type ExchangeInboundItemUpdate,
} from "./exchange-inbound-item"
import { CreateExchangeSchemaType } from "./schema"
import { getOrderChangeActionDetails } from "@lib/order-change-action"

type ExchangePreview = HttpTypes.AdminOrderPreview

type ExchangeInboundSectionProps = {
  order: HttpTypes.AdminOrder
  orderReturn?: { location_id?: string | null }
  exchange: { id: string }
  preview: ExchangePreview
  form: UseFormReturn<CreateExchangeSchemaType>
}

// Module-scoped scratch matches admin's pattern: the StackedFocusModal
// callbacks mutate these between Open and Save without re-rendering the
// section. Cleared on Save.
let itemsToAdd: string[] = []
let itemsToRemove: string[] = []

/**
 * Vendor port of admin's `ExchangeInboundSection`. Hosts the "Items to
 * return" picker, the inbound items list, location + return shipping
 * selectors. The shape mirrors admin one-for-one so the parent
 * `ExchangeCreateForm` can render `<ExchangeInboundSection form={form} />`
 * exactly the way admin does.
 *
 * Vendor adaptations:
 *  - `sdk.vendor.*` hooks (`useAddExchangeInboundItems`,
 *    `useRemoveExchangeInboundItem`, `useUpdateExchangeInboundItem`,
 *    `useAddExchangeInboundShipping`).
 *  - No `useDeleteExchangeInboundShipping` / `useUpdateReturn` in the
 *    vendor surface yet — shipping option changes just call add and let
 *    the backend pick the most recent action; location changes only set
 *    the form value (`useUpdateReturn` is admin-only).
 *  - No variant-level inventory map (admin queries
 *    `sdk.admin.productVariant.list` which doesn't exist on the vendor
 *    SDK). The per-item restock preview lives on `ExchangeInboundItem`
 *    via `getVariantRestockPreview`.
 *  - Currency-aware inbound picker: the inbound picker still reuses
 *    `AddExchangeInboundItemsTable` which already takes `currencyCode`.
 */
export const ExchangeInboundSection = ({
  order,
  preview,
  exchange,
  form,
  orderReturn,
}: ExchangeInboundSectionProps) => {
  const { t } = useTranslation()

  const { setIsOpen } = useStackedModal()

  const { mutateAsync: addInboundShipping } = useAddExchangeInboundShipping(
    exchange.id,
    order.id
  )

  const { mutateAsync: addInboundItem } = useAddExchangeInboundItems(
    exchange.id,
    order.id
  )

  const { mutateAsync: updateInboundItem } = useUpdateExchangeInboundItem(
    exchange.id,
    order.id
  )

  const { mutateAsync: removeInboundItem } = useRemoveExchangeInboundItem(
    exchange.id,
    order.id
  )

  /**
   * Only consider items that belong to this exchange.
   */
  const previewInboundItems = useMemo(
    () =>
      (preview?.items ?? []).filter(
        (i) => !!i.actions?.find((a) => a.exchange_id === exchange.id)
      ),
    [preview.items, exchange.id]
  )

  const inboundPreviewItems = previewInboundItems.filter(
    (item) => !!item.actions?.find((a) => a.action === "RETURN_ITEM")
  )

  const itemsMap = useMemo(
    () => new Map((order?.items ?? []).map((i) => [i.id, i])),
    [order.items]
  )

  const locationId = form.watch("location_id")

  const locationsGate = usePermissionGate("stock_locations:view")
  const shippingOptionsGate = usePermissionGate("shipping_options:view")

  const { stock_locations = [] } = useStockLocations(
    {
      limit: 999,
    },
    { enabled: locationsGate.allowed }
  )
  // Vendor's typed `useShippingOptions` overload requires a `queryKey` in
  // the options object — `enabled` alone is rejected. Cast through the
  // existing parameter shape to keep the call site readable.
  const { shipping_options = [] } = useShippingOptions(
    {
      limit: 999,
      stock_location_id: locationId,
    },
    {
      enabled: !!locationId && shippingOptionsGate.allowed,
    }
  )

  const inboundShippingOptions = shipping_options.filter(
    (shippingOption) =>
      !!shippingOption.rules?.find(
        (r) => r.attribute === "is_return" && r.value === "true"
      )
  )

  const {
    fields: inboundItems,
    append,
    remove,
    update,
  } = useFieldArray({
    name: "inbound_items",
    control: form.control,
  })

  const inboundItemsMap = useMemo(
    () => new Map(previewInboundItems.map((i) => [i.id, i])),
    [previewInboundItems]
  )

  // Reconcile RHF field array with the change-preview items the server
  // currently knows about. Mirrors admin's effect verbatim.
  useEffect(() => {
    const existingItemsMap: Record<string, boolean> = {}

    inboundPreviewItems.forEach((i) => {
      const ind = inboundItems.findIndex((field) => field.item_id === i.id)
      const requested = i.detail?.return_requested_quantity ?? 0

      existingItemsMap[i.id] = true

      if (ind > -1) {
        if (inboundItems[ind].quantity !== requested) {
          const returnItemAction = i.actions?.find(
            (a) => a.action === "RETURN_ITEM"
          )

          update(ind, {
            ...inboundItems[ind],
            quantity: requested,
            note: returnItemAction?.internal_note ?? undefined,
            reason_id:
              getOrderChangeActionDetails(returnItemAction).reason_id ??
              undefined,
          })
        }
      } else {
        append(
          { item_id: i.id, quantity: requested },
          { shouldFocus: false }
        )
      }
    })

    inboundItems.forEach((i, ind) => {
      if (!(i.item_id in existingItemsMap)) {
        remove(ind)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewInboundItems])

  useEffect(() => {
    const inboundShippingMethod = (preview.shipping_methods ?? []).find((s) =>
      s.actions?.find((a) => a.action === "SHIPPING_ADD" && !!a.return_id)
    )

    if (inboundShippingMethod?.shipping_option_id) {
      form.setValue("inbound_option_id", inboundShippingMethod.shipping_option_id)
    } else {
      form.setValue("inbound_option_id", "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview.shipping_methods])

  useEffect(() => {
    if (orderReturn?.location_id) {
      form.setValue("location_id", orderReturn.location_id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderReturn])

  const showInboundItemsPlaceholder = !inboundItems.length

  const onItemsSelected = async () => {
    if (itemsToAdd.length) {
      await addInboundItem(
        {
          items: itemsToAdd.map((id) => ({
            id,
            quantity: 1,
          })),
        },
        {
          onError: (error) => {
            toast.error(error.message)
          },
        }
      )
    }

    for (const itemToRemove of itemsToRemove) {
      const actionId = previewInboundItems
        .find((i) => i.id === itemToRemove)
        ?.actions?.find((a) => a.action === "RETURN_ITEM")?.id

      if (actionId) {
        // oxlint-disable-next-line eslint/no-await-in-loop -- sequential mutations on the same order-change/exchange record; parallelizing risks a backend race
        await removeInboundItem(actionId, {
          onError: (error) => {
            toast.error(error.message)
          },
        })
      }
    }

    setIsOpen("inbound-items", false)
  }

  // Vendor: `useUpdateReturn` isn't exposed here. Location changes only
  // mutate the form — the parent `ExchangeCreateForm` passes
  // `location_id` to `addInboundItems` on confirm, so the server picks it
  // up at request time.
  const onLocationChange = (_selectedLocationId?: string | null) => {
    /* no-op for vendor — admin parity preserved at the form level */
  }

  // Vendor doesn't have `useDeleteExchangeInboundShipping`; the backend
  // overwrites the previous SHIPPING_ADD action when a new one is added,
  // so we just call add. Errors surface via toast.
  const onShippingOptionChange = async (
    selectedOptionId: string | undefined
  ) => {
    if (selectedOptionId) {
      await addInboundShipping(
        { shipping_option_id: selectedOptionId },
        {
          onError: (error) => {
            toast.error(error.message)
          },
        }
      )
    }
  }

  return (
    <div>
      <div className="mt-8 flex items-center justify-between">
        <Heading level="h2">{t("orders.returns.inbound")}</Heading>

        <StackedFocusModal id="inbound-items">
          <StackedFocusModal.Trigger asChild>
            {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="focus-visible:shadow-borders-focus transition-fg txt-compact-small-plus cursor-pointer text-blue-500 outline-none hover:text-blue-400"
            >
              {t("actions.addItems")}
            </a>
          </StackedFocusModal.Trigger>

          <StackedFocusModal.Content>
            <StackedFocusModal.Header />

            <AddExchangeInboundItemsTable
              items={order.items ?? []}
              selectedItems={inboundItems.map((i) => i.item_id)}
              currencyCode={order.currency_code}
              onSelectionChange={(finalSelection) => {
                const alreadySelected = inboundItems.map((i) => i.item_id)

                itemsToAdd = finalSelection.filter(
                  (selection) => !alreadySelected.includes(selection)
                )
                itemsToRemove = alreadySelected.filter(
                  (selection) => !finalSelection.includes(selection)
                )
              }}
            />

            <StackedFocusModal.Footer>
              <div className="flex w-full items-center justify-end gap-x-4">
                <div className="flex items-center justify-end gap-x-2">
                  <RouteFocusModal.Close asChild>
                    <Button type="button" variant="secondary" size="small">
                      {t("actions.cancel")}
                    </Button>
                  </RouteFocusModal.Close>
                  <Button
                    key="submit-button"
                    type="submit"
                    variant="primary"
                    size="small"
                    onClick={async () => await onItemsSelected()}
                  >
                    {t("actions.save")}
                  </Button>
                </div>
              </div>
            </StackedFocusModal.Footer>
          </StackedFocusModal.Content>
        </StackedFocusModal>
      </div>

      {showInboundItemsPlaceholder && <ItemPlaceholder />}

      {inboundItems.map((item, index) => {
        const previewItem = inboundItemsMap.get(item.item_id)
        const sourceItem = itemsMap.get(item.item_id)
        if (!previewItem || !sourceItem) {
          return null
        }
        const locationName =
          stock_locations.find(
            (l) => l.id === locationId
          )?.name ?? null

        return (
          <ExchangeInboundItem
            key={item.id}
            item={sourceItem}
            previewItem={previewItem}
            currencyCode={order.currency_code}
            form={form}
            locationName={locationName}
            onRemove={() => {
              const actionId = previewInboundItems
                .find((i) => i.id === item.item_id)
                ?.actions?.find((a) => a.action === "RETURN_ITEM")?.id

              if (actionId) {
                removeInboundItem(actionId, {
                  onError: (error) => {
                    toast.error(error.message)
                  },
                })
              }
            }}
            onUpdate={(payload: ExchangeInboundItemUpdate) => {
              const action = previewInboundItems
                .find((i) => i.id === item.item_id)
                ?.actions?.find((a) => a.action === "RETURN_ITEM")

              if (action?.id) {
                updateInboundItem(
                  { $actionId: action.id, ...payload },
                  {
                    onError: (error) => {
                      const { quantity } = getOrderChangeActionDetails(action)

                      if (quantity && payload.quantity) {
                        form.setValue(`inbound_items.${index}.quantity`, quantity)
                      }
                      toast.error(error.message)
                    },
                  }
                )
              }
            }}
            index={index}
          />
        )
      })}

      {!showInboundItemsPlaceholder && (
        <div className="mt-8 flex flex-col gap-y-4">
          {/* LOCATION */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <Form.Label>{t("orders.returns.location")}</Form.Label>
              <Form.Hint className="!mt-1">
                {t("orders.returns.locationHint")}
              </Form.Hint>
            </div>

            <Form.Field
              control={form.control}
              name="location_id"
              render={({ field: { value, onChange, ...field } }) => {
                return (
                  <Form.Item>
                    <ConditionalTooltip
                      showTooltip={locationsGate.denied}
                      content={locationsGate.tooltip}
                    >
                      <div>
                        <Form.Control>
                          <Combobox
                            {...field}
                            value={value ?? undefined}
                            onChange={(next) => {
                              const v = getSingleComboboxValue(next)
                              onChange(v)
                              onLocationChange(v)
                            }}
                            disabled={locationsGate.denied}
                            options={stock_locations.map((stockLocation) => ({
                              label: stockLocation.name,
                              value: stockLocation.id,
                            }))}
                          />
                        </Form.Control>
                      </div>
                    </ConditionalTooltip>
                  </Form.Item>
                )
              }}
            />
          </div>

          {/* INBOUND SHIPPING */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <Form.Label>
                {t("orders.returns.inboundShipping")}
                <Text
                  size="small"
                  leading="compact"
                  className="text-ui-fg-muted ml-1 inline"
                >
                  ({t("fields.optional")})
                </Text>
              </Form.Label>

              <Form.Hint className="!mt-1">
                {t("orders.returns.inboundShippingHint")}
              </Form.Hint>
            </div>

            <Form.Field
              control={form.control}
              name="inbound_option_id"
              render={({ field: { value, onChange, ...field } }) => {
                return (
                  <Form.Item>
                    <ConditionalTooltip
                      showTooltip={shippingOptionsGate.denied}
                      content={shippingOptionsGate.tooltip}
                    >
                      <div>
                        <Form.Control>
                          <Combobox
                            allowClear
                            value={value ?? undefined}
                            onChange={(next) => {
                              const val = getSingleComboboxValue(next)
                              onChange(val)
                              onShippingOptionChange(val)
                            }}
                            {...field}
                            options={inboundShippingOptions.map((so) => ({
                              label: so.name,
                              value: so.id,
                            }))}
                            disabled={!locationId || shippingOptionsGate.denied}
                          />
                        </Form.Control>
                      </div>
                    </ConditionalTooltip>
                  </Form.Item>
                )
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
