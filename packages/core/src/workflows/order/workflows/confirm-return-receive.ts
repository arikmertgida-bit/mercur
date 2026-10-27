import {
  BigNumberInput,
  IOrderModuleService,
  OrderChangeDTO,
  OrderPreviewDTO,
} from "@medusajs/framework/types"
import {
  ChangeActionType,
  MathBN,
  MedusaError,
  Modules,
  OrderChangeStatus,
  OrderWorkflowEvents,
  ReturnStatus,
} from "@medusajs/framework/utils"
import {
  createHook,
  createWorkflow,
  createStep,
  Hook,
  parallelize,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  adjustInventoryLevelsStep,
  createOrUpdateOrderPaymentCollectionWorkflow,
  emitEventStep,
  previewOrderChangeStep,
  updateReturnItemsStep,
  updateReturnsStep,
  useRemoteQueryStep,
} from "@medusajs/medusa/core-flows"
import { z } from "zod"
import { buildVariantInventoryLinkMap, VariantInventoryRow, VariantInventoryRowSchema } from "../utils"
import { InventoryWorkflowEvents } from "../../events"
import { GraphBigNumberSchema, parseGraphRow } from "../../../utils/graph-rows"
import { JsonRecordSchema } from "../../../utils/json-schema"

const ReturnRowSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  location_id: z.string().nullish(),
  items: z
    .array(
      z.object({
        id: z.string(),
        item_id: z.string(),
        quantity: GraphBigNumberSchema,
        received_quantity: GraphBigNumberSchema.nullish(),
        item: z
          .object({
            id: z.string(),
            variant_id: z.string().nullish(),
            variant: VariantInventoryRowSchema.nullish(),
          })
          .nullish(),
      }),
    )
    .nullish(),
})

type ReturnRow = z.infer<typeof ReturnRowSchema>

const OrderRowSchema = z.object({
  id: z.string(),
  seller: z.object({ id: z.string() }).nullish(),
})

const OrderChangeRowSchema = z.object({
  id: z.string(),
  status: z.enum(OrderChangeStatus),
  actions: z.array(
    z.object({
      action: z.enum(ChangeActionType),
      details: JsonRecordSchema.nullish(),
    }),
  ),
})

// A receive action's `details.reference_id` is the returned order line item.
const ReceiveActionDetailsSchema = z.object({
  reference_id: z.string(),
  quantity: GraphBigNumberSchema,
})

type ReceiveAction = {
  action: ChangeActionType
  details: z.infer<typeof ReceiveActionDetailsSchema>
}

const RECEIVE_ACTIONS: ChangeActionType[] = [
  ChangeActionType.RECEIVE_RETURN_ITEM,
  ChangeActionType.RECEIVE_DAMAGED_RETURN_ITEM,
]

type ConfirmOrderChangesInput = {
  orderId: string
  changes: Pick<OrderChangeDTO, "id" | "status">[]
  confirmed_by?: string
}

type ConfirmedOrderChange = {
  orderId: string
  lastChange: Partial<OrderChangeDTO>
}

const confirmOrderChangesStep = createStep(
  "mercur-confirm-order-changes",
  async (input: ConfirmOrderChangesInput, { container }) => {
    const orderModuleService = container.resolve<IOrderModuleService>(Modules.ORDER)
    const currentChanges: Partial<OrderChangeDTO>[] = []
    const orderChanges = await orderModuleService.confirmOrderChange(
      input.changes.map((action) => {
        const update = { id: action.id, confirmed_by: input.confirmed_by }
        currentChanges.push({
          ...update,
          order_id: input.orderId,
          status: action.status,
        })
        return update
      }),
    )
    const [lastChange] = currentChanges
    const compensation: ConfirmedOrderChange | undefined = lastChange
      ? { orderId: input.orderId, lastChange }
      : undefined
    return new StepResponse(orderChanges, compensation)
  },
  async (compensation, { container }) => {
    if (!compensation) return
    const orderModuleService = container.resolve<IOrderModuleService>(Modules.ORDER)
    await orderModuleService.undoLastChange(
      compensation.orderId,
      compensation.lastChange,
    )
  },
)

type InventoryAdjustment = {
  inventory_item_id: string
  location_id: string
  adjustment: BigNumberInput
}

function prepareInventoryUpdate({
  orderReturn,
  returnedQuantityByVariant,
}: {
  orderReturn: ReturnRow
  returnedQuantityByVariant: Record<string, BigNumberInput>
}): InventoryAdjustment[] {
  const inventoryAdjustment: InventoryAdjustment[] = []

  const returnItems = orderReturn.items ?? []
  const variants = returnItems
    .map((retItem) => retItem.item?.variant)
    .filter((v): v is VariantInventoryRow => !!v)
  const variantInventoryByVariantId = buildVariantInventoryLinkMap(variants)

  let hasManagedInventory = false
  let hasStockLocation = false

  for (const links of Object.values(variantInventoryByVariantId)) {
    const normalized = Object.values(links)
    if (!normalized.length) continue
    hasManagedInventory = true

    if (
      normalized.some((link) =>
        (link.inventory?.location_levels ?? []).some(
          (lvl) => lvl.location_id === orderReturn.location_id,
        ),
      )
    ) {
      hasStockLocation = true
    }
  }

  // No returned variant manages inventory, so there is nothing to restock.
  if (!hasManagedInventory) {
    return inventoryAdjustment
  }

  const locationId = orderReturn.location_id
  if (!locationId || !hasStockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Cannot receive the return at location ${orderReturn.location_id}: none of the returned items' inventory is stocked at this location.`,
    )
  }

  for (const [variantId, quantity] of Object.entries(returnedQuantityByVariant)) {
    const links = Object.values(variantInventoryByVariantId[variantId] ?? {})
    for (const link of links) {
      inventoryAdjustment.push({
        inventory_item_id: link.inventory_item_id,
        location_id: locationId,
        adjustment: MathBN.mult(quantity, link.required_quantity),
      })
    }
  }

  return inventoryAdjustment
}

export type ConfirmReceiveReturnRequestWorkflowInput = {
  return_id: string
  confirmed_by?: string
  no_notification?: boolean
}

export const confirmReturnReceiveWorkflowId = "mercur-confirm-return-receive"

export type ConfirmReturnReceiveWorkflowHooks = [
  Hook<
    "returnReceived",
    {
      order_id: string
      return_id: string
      seller_id: string | null
      items: {
        id: string
        received_quantity: BigNumberInput
        damaged_quantity: BigNumberInput
      }[]
    },
    void
  >,
]

export const confirmReturnReceiveWorkflow = createWorkflow(
  confirmReturnReceiveWorkflowId,
  function (
    input: ConfirmReceiveReturnRequestWorkflowInput,
  ): WorkflowResponse<OrderPreviewDTO, ConfirmReturnReceiveWorkflowHooks> {
    const orderReturnRow = useRemoteQueryStep({
      entry_point: "return",
      fields: [
        "id",
        "status",
        "order_id",
        "location_id",
        "canceled_at",
        "items.*",
        "items.item.id",
        "items.item.variant_id",
        "items.item.variant.id",
        "items.item.variant.inventory_items.inventory_item_id",
        "items.item.variant.inventory_items.required_quantity",
        "items.item.variant.inventory_items.inventory.id",
        "items.item.variant.inventory_items.inventory.location_levels.location_id",
      ],
      variables: { id: input.return_id },
      list: false,
      throw_if_key_not_found: true,
    }).config({ name: "return-query" })

    const orderReturn = transform({ orderReturnRow }, ({ orderReturnRow }) =>
      parseGraphRow(ReturnRowSchema, orderReturnRow),
    )

    const orderRow = useRemoteQueryStep({
      entry_point: "orders",
      fields: ["id", "version", "canceled_at", "seller.id"],
      variables: { id: orderReturn.order_id },
      list: false,
      throw_if_key_not_found: true,
    }).config({ name: "order-query" })

    const order = transform({ orderRow }, ({ orderRow }) =>
      parseGraphRow(OrderRowSchema, orderRow),
    )

    const orderChangeRow = useRemoteQueryStep({
      entry_point: "order_change",
      fields: [
        "id",
        "status",
        "actions.id",
        "actions.action",
        "actions.details",
        "actions.reference",
        "actions.reference_id",
        "actions.internal_note",
      ],
      variables: {
        filters: {
          order_id: orderReturn.order_id,
          return_id: orderReturn.id,
          status: [OrderChangeStatus.PENDING, OrderChangeStatus.REQUESTED],
        },
      },
      list: false,
    }).config({ name: "order-change-query" })

    const orderChange = transform({ orderChangeRow }, ({ orderChangeRow }) =>
      parseGraphRow(OrderChangeRowSchema, orderChangeRow),
    )

    const { updateReturnItem, returnedQuantityByVariant, updateReturn } =
      transform({ orderChange, orderReturn }, (data) => {
        const returnedQuantityByVariant: Record<string, BigNumberInput> = {}

        const retItems = data.orderReturn.items ?? []
        const received: ReceiveAction[] = []

        const variantByLineItemId = new Map<string, string>()
        for (const ri of retItems) {
          const lineItemId = ri.item?.id
          const variantId = ri.item?.variant_id
          if (lineItemId && variantId) {
            variantByLineItemId.set(lineItemId, variantId)
          }
        }

        data.orderChange.actions.forEach((act) => {
          if (!RECEIVE_ACTIONS.includes(act.action)) {
            return
          }

          const details = parseGraphRow(ReceiveActionDetailsSchema, act.details)
          received.push({ action: act.action, details })

          if (act.action === ChangeActionType.RECEIVE_RETURN_ITEM) {
            const variantId = variantByLineItemId.get(details.reference_id)
            if (!variantId) {
              return
            }
            const current = returnedQuantityByVariant[variantId] ?? 0
            returnedQuantityByVariant[variantId] = MathBN.add(
              current,
              details.quantity,
            )
          }
        })

        const itemMap: Record<string, string> = {}
        for (const item of retItems) {
          itemMap[item.item_id] = item.id
        }

        const itemUpdates: Record<
          string,
          {
            id: string
            received_quantity: BigNumberInput
            damaged_quantity: BigNumberInput
          }
        > = {}
        received.forEach(({ action, details }) => {
          const itemId = details.reference_id
          const existing = itemUpdates[itemId]
          if (existing) {
            existing.received_quantity = MathBN.add(
              existing.received_quantity,
              details.quantity,
            )

            if (action === ChangeActionType.RECEIVE_DAMAGED_RETURN_ITEM) {
              existing.damaged_quantity = MathBN.add(
                existing.damaged_quantity,
                details.quantity,
              )
            }
            return
          }

          itemUpdates[itemId] = {
            id: itemMap[itemId],
            received_quantity: details.quantity,
            damaged_quantity:
              action === ChangeActionType.RECEIVE_DAMAGED_RETURN_ITEM
                ? details.quantity
                : 0,
          }
        })

        const hasReceivedAllItems = retItems.every((item) => {
          const itemId = item.item_id
          const received: BigNumberInput = itemUpdates[itemId]
            ? itemUpdates[itemId].received_quantity
            : (item.received_quantity ?? 0)
          return MathBN.eq(received, item.quantity)
        })
        const updateReturnData = hasReceivedAllItems
          ? { status: ReturnStatus.RECEIVED, received_at: new Date() }
          : { status: ReturnStatus.PARTIALLY_RECEIVED }

        const updateReturn = {
          id: data.orderReturn.id,
          ...updateReturnData,
        }

        return {
          updateReturnItem: Object.values(itemUpdates),
          returnedQuantityByVariant,
          updateReturn,
        }
      })

    const inventoryAdjustment = transform(
      { orderReturn, returnedQuantityByVariant },
      prepareInventoryUpdate,
    )

    parallelize(
      updateReturnsStep([updateReturn]),
      updateReturnItemsStep(updateReturnItem),
      confirmOrderChangesStep({
        changes: [orderChange],
        orderId: order.id,
        confirmed_by: input.confirmed_by,
      }),
      adjustInventoryLevelsStep(inventoryAdjustment),
    )

    const changedInventoryItemIds = transform(
      { inventoryAdjustment },
      ({ inventoryAdjustment }) => {
        return {
          inventory_item_ids: Array.from(
            new Set(
              inventoryAdjustment.map((adjustment) => adjustment.inventory_item_id)
            )
          ),
        }
      },
    )

    parallelize(
      createOrUpdateOrderPaymentCollectionWorkflow.runAsStep({
        input: { order_id: order.id },
      }),
      emitEventStep({
        eventName: OrderWorkflowEvents.RETURN_RECEIVED,
        data: {
          order_id: order.id,
          return_id: orderReturn.id,
          no_notification: input.no_notification,
        },
      }),
      // Restocked in the parallelize block above (already resolved).
      emitEventStep({
        eventName: InventoryWorkflowEvents.LEVEL_CHANGED,
        data: changedInventoryItemIds,
      }).config({
        name: "inventory-level-changed-event",
      }),
    )

    const sellerId = transform({ order }, ({ order }) => order.seller?.id ?? null)

    const returnReceived: ConfirmReturnReceiveWorkflowHooks[0] = createHook(
      "returnReceived",
      {
        order_id: order.id,
        return_id: orderReturn.id,
        seller_id: sellerId,
        items: updateReturnItem,
      }
    )

    return new WorkflowResponse(previewOrderChangeStep(order.id), {
      hooks: [returnReceived],
    })
  },
)
