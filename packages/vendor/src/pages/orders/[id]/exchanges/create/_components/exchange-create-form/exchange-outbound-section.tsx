import { HttpTypes } from "@medusajs/types"
import { Button, Heading, toast } from "@medusajs/ui"
import { useEffect, useMemo } from "react"
import { useFieldArray, UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "@components/common/form"
import { Combobox } from "@components/inputs/combobox"
import {
  RouteFocusModal,
  StackedFocusModal,
  useStackedModal,
} from "@components/modals"
import {
  useAddExchangeOutboundItems,
  useAddExchangeOutboundShipping,
  useRemoveExchangeOutboundItem,
  useUpdateExchangeOutboundItem,
} from "@hooks/api/exchanges"

import { AddExchangeOutboundItemsTable } from "../add-exchange-outbound-items-table"
import { ItemPlaceholder } from "../../../../claims/create/_components/claim-create-form/item-placeholder"
import { ExchangeOutboundItem } from "./exchange-outbound-item"
import { CreateExchangeSchemaType } from "./schema"

// See `exchange-inbound-section.tsx` for the rationale on the inlined
// preview shape. We only describe the fields we read.
type ExchangePreview = {
  items?: Array<{
    id: string
    variant_id?: string | null
    detail?: { quantity?: number }
    actions?: Array<{
      id?: string
      action?: string
      exchange_id?: string | null
      return_id?: string | null
    }>
    title?: string | null
    product_title?: string | null
    variant_title?: string | null
    variant_sku?: string | null
    subtitle?: string | null
    thumbnail?: string | null
    total?: number | null
    adjustments?: Array<{ code?: string | null }>
  }>
  shipping_methods?: Array<{
    shipping_option_id?: string | null
    actions?: Array<{
      id?: string
      action?: string
      return_id?: string | null
    }>
  }>
}

type ExchangeOutboundSectionProps = {
  order: HttpTypes.AdminOrder
  exchange: { id: string }
  preview: ExchangePreview
  form: UseFormReturn<CreateExchangeSchemaType>
}

// Module-scoped scratch buffers populated by the picker callbacks and read
// once on "Save" — the stacked modal lives in a separate React subtree, so
// prop-drilling the selection through it isn't practical.
let variantsToAdd: string[] = []
let variantsToRemove: string[] = []

/**
 * Vendor port of admin's `ExchangeOutboundSection`. Hosts the outbound
 * (replacement) item picker, the staged outbound list, and the outbound
 * shipping selector.
 *
 * No `useDeleteExchangeOutboundShipping` / `useOrderShippingOptions` in the
 * vendor surface yet; shipping option changes call add and let the backend
 * overwrite the previous SHIPPING_ADD action.
 */
export const ExchangeOutboundSection = ({
  order,
  preview,
  exchange,
  form,
}: ExchangeOutboundSectionProps) => {
  const { t } = useTranslation()

  const { setIsOpen } = useStackedModal()

  const { mutateAsync: addOutboundShipping } = useAddExchangeOutboundShipping(
    exchange.id,
    order.id
  )

  const { mutateAsync: addOutboundItem } = useAddExchangeOutboundItems(
    exchange.id,
    order.id
  )

  const { mutateAsync: updateOutboundItem } = useUpdateExchangeOutboundItem(
    exchange.id,
    order.id
  )

  const { mutateAsync: removeOutboundItem } = useRemoveExchangeOutboundItem(
    exchange.id,
    order.id
  )

  /**
   * Only consider items that belong to this exchange and are outbound.
   */
  const previewOutboundItems = useMemo(
    () =>
      (preview?.items ?? []).filter(
        (i) =>
          !!i.actions?.find(
            (a) => a.exchange_id === exchange.id && a.action === "ITEM_ADD"
          )
      ),
    [preview.items, exchange.id]
  )

  const {
    fields: outboundItems,
    append,
    remove,
    update,
  } = useFieldArray({
    name: "outbound_items",
    control: form.control,
  })

  const previewItemsMap = useMemo(
    () => new Map(previewOutboundItems.map((i) => [i.id, i])),
    [previewOutboundItems]
  )

  useEffect(() => {
    const existingItemsMap: Record<string, boolean> = {}

    previewOutboundItems.forEach((i) => {
      const ind = outboundItems.findIndex((field) => field.item_id === i.id)
      const requested = i.detail?.quantity ?? 0

      existingItemsMap[i.id] = true

      if (ind > -1) {
        if (outboundItems[ind].quantity !== requested) {
          update(ind, {
            ...outboundItems[ind],
            quantity: requested,
          })
        }
      } else {
        append(
          {
            item_id: i.id,
            quantity: requested,
            variant_id: i.variant_id ?? undefined,
          },
          { shouldFocus: false }
        )
      }
    })

    outboundItems.forEach((i, ind) => {
      if (!(i.item_id in existingItemsMap)) {
        remove(ind)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOutboundItems])

  const showOutboundItemsPlaceholder = !outboundItems.length

  const onItemsSelected = async () => {
    if (variantsToAdd.length) {
      await addOutboundItem(
        {
          items: variantsToAdd.map((variant_id) => ({
            variant_id,
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

    for (const variantToRemove of variantsToRemove) {
      const field = outboundItems.find(
        (f) => f.variant_id === variantToRemove
      )
      const previewMatch = field
        ? previewOutboundItems.find((i) => i.id === field.item_id)
        : undefined
      const actionId = previewMatch?.actions?.find(
        (a) => a.action === "ITEM_ADD"
      )?.id

      if (actionId) {
        await removeOutboundItem(actionId, {
          onError: (error) => {
            toast.error(error.message)
          },
        })
      }
    }

    setIsOpen("outbound-items", false)
  }

  useEffect(() => {
    const outboundShipping = (preview.shipping_methods ?? []).find(
      (s) =>
        !!s.actions?.find((a) => a.action === "SHIPPING_ADD" && !a.return_id)
    )

    if (outboundShipping?.shipping_option_id) {
      form.setValue("outbound_option_id", outboundShipping.shipping_option_id)
    } else {
      form.setValue("outbound_option_id", "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview.shipping_methods])

  const onShippingOptionChange = async (
    selectedOptionId: string | undefined
  ) => {
    if (selectedOptionId) {
      await addOutboundShipping(
        { shipping_option_id: selectedOptionId } as never,
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
        <Heading level="h2">{t("orders.returns.outbound")}</Heading>

        <StackedFocusModal id="outbound-items">
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

            <AddExchangeOutboundItemsTable
              selectedItems={outboundItems
                .map((i) => i.variant_id)
                .filter((id): id is string => !!id)}
              onSelectionChange={(finalSelection) => {
                const alreadySelected = outboundItems
                  .map((i) => i.variant_id)
                  .filter((id): id is string => !!id)

                variantsToAdd = finalSelection.filter(
                  (selection) => !alreadySelected.includes(selection)
                )
                variantsToRemove = alreadySelected.filter(
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

      {showOutboundItemsPlaceholder && <ItemPlaceholder />}

      {outboundItems.map((item, index) => {
        const previewItem = previewItemsMap.get(item.item_id)
        if (!previewItem) {
          return null
        }
        return (
          <ExchangeOutboundItem
            key={item.id}
            previewItem={previewItem}
            currencyCode={order.currency_code}
            form={form}
            onRemove={() => {
              const actionId = previewOutboundItems
                .find((i) => i.id === item.item_id)
                ?.actions?.find((a) => a.action === "ITEM_ADD")?.id

              if (actionId) {
                removeOutboundItem(actionId, {
                  onError: (error) => {
                    toast.error(error.message)
                  },
                })
              }
            }}
            onUpdate={(payload) => {
              const actionId = previewOutboundItems
                .find((i) => i.id === item.item_id)
                ?.actions?.find((a) => a.action === "ITEM_ADD")?.id

              if (actionId) {
                updateOutboundItem(
                  { $actionId: actionId, ...payload } as never,
                  {
                    onError: (error) => {
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

      {!showOutboundItemsPlaceholder && (
        <div className="mt-8 flex flex-col gap-y-4">
          {/* OUTBOUND SHIPPING */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <Form.Label>{t("orders.exchanges.outboundShipping")}</Form.Label>
              <Form.Hint className="!mt-1">
                {t("orders.exchanges.outboundShippingHint")}
              </Form.Hint>
            </div>

            <Form.Field
              control={form.control}
              name="outbound_option_id"
              render={({ field: { value, onChange, ...field } }) => {
                return (
                  <Form.Item>
                    <Form.Control>
                      <Combobox
                        allowClear
                        value={value ?? undefined}
                        onChange={(val) => {
                          onChange(val)
                          onShippingOptionChange(val)
                        }}
                        {...field}
                        options={[]}
                        disabled
                      />
                    </Form.Control>
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
