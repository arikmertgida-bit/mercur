import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Input, Label, Text, toast } from "@medusajs/ui"
import { useEffect } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Form } from "@components/common/form"
import { RouteDrawer, useRouteModal } from "@components/modals"
import { KeyboundForm } from "@components/utilities/keybound-form"
import {
  InventoryItemWithLevels,
  useBatchInventoryItemsLocationLevels,
} from "@hooks/api/inventory"
import { castNumber } from "@lib/cast-number"
import { sanitizeNumberInput } from "@lib/sanitize-number-input"

const EditStockSchema = z.object({
  levels: z.array(
    z.object({
      inventory_item_id: z.string(),
      location_id: z.string(),
      location_name: z.string(),
      stocked_quantity: z.union([z.number(), z.string()]),
    })
  ),
})

type EditStockFormValues = z.infer<typeof EditStockSchema>

type EditStockFormProps = {
  inventoryItemsWithLevels: InventoryItemWithLevels[]
}

function getDefaultValues(
  inventoryItemsWithLevels: InventoryItemWithLevels[]
): EditStockFormValues {
  return {
    levels: inventoryItemsWithLevels.flatMap((item) =>
      item.location_levels.map((level) => ({
        inventory_item_id: item.inventory_item_id,
        location_id: level.location_id,
        location_name:
          level.stock_locations?.map((loc) => loc.name).join(", ") ||
          level.location_id,
        stocked_quantity: level.stocked_quantity,
      }))
    ),
  }
}

// `inventoryItemsWithLevels` is recomputed (new array reference) on every
// render of the parent regardless of whether the underlying stock actually
// changed. Resetting the form on every such render would wipe whatever the
// vendor is mid-typing, so the reset effect below keys off this content
// signature instead of the array reference.
function getLevelsSignature(
  inventoryItemsWithLevels: InventoryItemWithLevels[]
): string {
  return inventoryItemsWithLevels
    .flatMap((item) =>
      item.location_levels.map(
        (level) =>
          `${item.inventory_item_id}:${level.location_id}:${level.stocked_quantity}`
      )
    )
    .join("|")
}

/**
 * Reused by both the product detail page's stock drawer (aggregated across
 * every variant) and the variant detail page's stock drawer (one variant) —
 * the row shape (inventory_item x location) is identical either way, and
 * both submit through the same batch endpoint Envanter itself uses.
 */
export const EditStockForm = ({
  inventoryItemsWithLevels,
}: EditStockFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const form = useForm<EditStockFormValues>({
    defaultValues: getDefaultValues(inventoryItemsWithLevels),
    resolver: zodResolver(EditStockSchema),
  })

  // `defaultValues` is only read once at mount — react-hook-form does not
  // react to prop changes. Stock is live data that can change out from
  // under an already-open drawer (order fulfillment, another session's
  // edit), so the form is kept in sync explicitly whenever a fresh fetch
  // resolves with different values.
  const levelsSignature = getLevelsSignature(inventoryItemsWithLevels)
  useEffect(() => {
    form.reset(getDefaultValues(inventoryItemsWithLevels))
    // Only the content signature should retrigger this — `inventoryItemsWithLevels`
    // itself is a new array reference on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelsSignature, form])

  const { fields } = useFieldArray({ control: form.control, name: "levels" })

  const { mutateAsync, isPending } = useBatchInventoryItemsLocationLevels()

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(
      {
        update: values.levels.map((level) => ({
          inventory_item_id: level.inventory_item_id,
          location_id: level.location_id,
          stocked_quantity: castNumber(level.stocked_quantity),
        })),
      },
      {
        onSuccess: () => {
          toast.success(t("products.stock.edit.successToast"))
          handleSuccess()
        },
        onError: (e) => {
          toast.error(e.message)
        },
      }
    )
  })

  if (!fields.length) {
    return (
      <RouteDrawer.Body>
        <Text size="small" className="text-ui-fg-muted">
          {t("general.noRecordsTitle")}
        </Text>
      </RouteDrawer.Body>
    )
  }

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-4 overflow-y-auto">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-2 items-start gap-4"
              data-testid={`product-stock-edit-row-${index}`}
            >
              <div className="flex flex-col gap-y-2">
                <Label size="small">{t("products.stock.edit.location")}</Label>
                <Text
                  size="small"
                  leading="compact"
                  className="text-ui-fg-subtle px-2 py-1.5"
                >
                  {field.location_name}
                </Text>
              </div>
              <Form.Field
                control={form.control}
                name={`levels.${index}.stocked_quantity`}
                render={({ field: { onChange, value, ...rest } }) => (
                  <Form.Item>
                    <Form.Label>{t("products.stock.edit.quantity")}</Form.Label>
                    <Form.Control>
                      <Input
                        type="number"
                        value={value}
                        onChange={onChange}
                        onKeyDown={(e) => sanitizeNumberInput(e, [",", "."])}
                        {...rest}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            </div>
          ))}
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button type="submit" size="small" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
