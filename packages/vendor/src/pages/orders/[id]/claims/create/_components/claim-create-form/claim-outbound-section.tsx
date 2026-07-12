import { AdminOrder, AdminOrderPreview, HttpTypes } from "@medusajs/types"
import { Button, Heading, toast } from "@medusajs/ui"
import { useEffect, useMemo } from "react"
import { useFieldArray, UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import {
  RouteFocusModal,
  StackedFocusModal,
  useStackedModal,
} from "@components/modals"
import {
  useAddClaimOutboundItems,
  useRemoveClaimOutboundItem,
  useUpdateClaimOutboundItem,
} from "@hooks/api/claims"

import { AddClaimOutboundItemsTable } from "../add-claim-outbound-items-table"
import { ClaimOutboundItem } from "./claim-outbound-item"
import { ItemPlaceholder } from "./item-placeholder"
import { CreateClaimSchemaType } from "./schema"

type ClaimOutboundSectionProps = {
  order: AdminOrder
  claim: { id: string }
  preview: AdminOrderPreview
  form: UseFormReturn<CreateClaimSchemaType>
}

const STACKED_MODAL_ID = "claim-add-outbound-items"

// Populated by the picker's onSelectionChange and read once on "Save" — the
// picker lives in a separate StackedFocusModal subtree, so prop-drilling the
// selection through it isn't practical (mirrors exchange-outbound-section).
let selectedVariantIds: string[] = []

/**
 * Vendor port of admin's `ClaimOutboundSection`. Replacement items are
 * added to the claim immediately on selection via `useAddClaimOutboundItems`
 * (same proven pattern as `exchange-outbound-section.tsx` and admin's own
 * claim outbound section) — the displayed list is driven by the order
 * change preview, not local-only form state, so it survives a refresh and
 * is actually included when the claim is confirmed.
 */
export const ClaimOutboundSection = ({
  order,
  preview,
  claim,
  form,
}: ClaimOutboundSectionProps) => {
  const { t } = useTranslation()
  const { setIsOpen } = useStackedModal()

  const { mutateAsync: addOutboundItem } = useAddClaimOutboundItems(
    claim.id,
    order.id
  )

  const { mutateAsync: updateOutboundItem } = useUpdateClaimOutboundItem(
    claim.id,
    order.id
  )

  const { mutateAsync: removeOutboundItem } = useRemoveClaimOutboundItem(
    claim.id,
    order.id
  )

  /**
   * Only consider items that belong to this claim and are outbound
   * (replacement) items.
   */
  const previewOutboundItems = useMemo(
    () =>
      preview?.items?.filter(
        (i) =>
          !!i.actions?.find(
            (a) => a.claim_id === claim.id && a.action === "ITEM_ADD"
          )
      ) ?? [],
    [preview.items, claim.id]
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
    const alreadyAdded = new Set(
      previewOutboundItems
        .map((i) => i.variant_id)
        .filter((id): id is string => !!id)
    )
    const variantsToAdd = selectedVariantIds.filter(
      (id) => !alreadyAdded.has(id)
    )

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

    setIsOpen(STACKED_MODAL_ID, false)
  }

  return (
    <div>
      <div className="mt-8 flex items-center justify-between">
        <Heading level="h2">{t("orders.claims.outboundItems")}</Heading>

        <StackedFocusModal id={STACKED_MODAL_ID}>
          <StackedFocusModal.Trigger asChild>
            {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="focus-visible:shadow-borders-focus transition-fg txt-compact-small-plus cursor-pointer text-blue-500 outline-none hover:text-blue-400"
              data-testid="claim-add-outbound-trigger"
            >
              {t("orders.claims.addOutboundItems")}
            </a>
          </StackedFocusModal.Trigger>
          <StackedFocusModal.Content>
            <StackedFocusModal.Header />
            <StackedFocusModal.Title asChild>
              <span className="sr-only">
                {t("orders.claims.addOutboundItems")}
              </span>
            </StackedFocusModal.Title>
            <StackedFocusModal.Description className="sr-only">
              {t("orders.claims.addOutboundItemsDescription")}
            </StackedFocusModal.Description>

            <StackedFocusModal.Body className="size-full overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <AddClaimOutboundItemsTable
                  onSelectionChange={(ids) => {
                    selectedVariantIds = ids
                  }}
                />
              </div>
            </StackedFocusModal.Body>
            <StackedFocusModal.Footer>
              <div className="flex w-full items-center justify-end gap-x-2">
                <RouteFocusModal.Close asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    data-testid="claim-add-outbound-cancel"
                  >
                    {t("actions.cancel")}
                  </Button>
                </RouteFocusModal.Close>
                <Button
                  key="submit-button"
                  type="button"
                  variant="primary"
                  size="small"
                  data-testid="claim-add-outbound-save"
                  onClick={async () => await onItemsSelected()}
                >
                  {t("actions.save")}
                </Button>
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
          <ClaimOutboundItem
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
            onUpdate={(payload: HttpTypes.AdminUpdateReturnItems) => {
              const actionId = previewOutboundItems
                .find((i) => i.id === item.item_id)
                ?.actions?.find((a) => a.action === "ITEM_ADD")?.id

              if (actionId) {
                updateOutboundItem(
                  { actionId, ...payload } as never,
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
    </div>
  )
}
