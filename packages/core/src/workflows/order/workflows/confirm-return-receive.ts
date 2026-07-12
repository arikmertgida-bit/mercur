import {
  BigNumberInput,
  OrderChangeActionDTO,
  OrderChangeDTO,
  OrderDTO,
  OrderPreviewDTO,
  OrderReturnItemDTO,
  ReturnDTO,
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
  createWorkflow,
  createStep,
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
import { buildVariantInventoryLinkMap, VariantInventoryRow } from "../utils"

type ConfirmOrderChangesInput = {
  orderId: string
  changes: OrderChangeDTO[]
  confirmed_by?: string
}

const confirmOrderChangesStep = createStep(
  "mercur-confirm-order-changes",
  async (input: ConfirmOrderChangesInput, { container }) => {
    const orderModuleService = container.resolve(Modules.ORDER)
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
    return new StepResponse(orderChanges, currentChanges)
  },
  async (currentChanges, { container }) => {
    if (!currentChanges?.length) return
    const orderModuleService = container.resolve(Modules.ORDER)
    await orderModuleService.undoLastChange(
      currentChanges[0].order_id!,
      currentChanges[0],
    )
  },
)

type ReturnItemWithVariant = OrderReturnItemDTO & {
  item_id: string
  item?: {
    id?: string
    variant_id?: string
    variant?: VariantInventoryRow | null
  } | null
}

type ReturnWithVariantItems = ReturnDTO & {
  items: ReturnItemWithVariant[]
}

function prepareInventoryUpdate({
  orderReturn,
  returnedQuantityByVariant,
}: {
  orderReturn: ReturnWithVariantItems
  returnedQuantityByVariant: Record<string, BigNumberInput>
}) {
  const inventoryAdjustment: {
    inventory_item_id: string
    location_id: string
    adjustment: BigNumberInput
  }[] = []

  const returnItems: ReturnItemWithVariant[] = orderReturn.items ?? []
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

  if (hasManagedInventory && !hasStockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Cannot receive the return at location ${orderReturn.location_id}: none of the returned items' inventory is stocked at this location.`,
    )
  }

  const locationId = orderReturn.location_id as string

  for (const [variantId, quantity] of Object.entries(returnedQuantityByVariant)) {
    const links = Object.values(variantInventoryByVariantId[variantId] ?? {})
    for (const link of links) {
      inventoryAdjustment.push({
        inventory_item_id: link.inventory_item_id,
        location_id: locationId,
        adjustment: MathBN.mult(
          quantity as BigNumberInput,
          link.required_quantity,
        ),
      })
    }
  }

  return inventoryAdjustment
}

export type ConfirmReceiveReturnRequestWorkflowInput = {
  return_id: string
  confirmed_by?: string
}

export const confirmReturnReceiveWorkflowId = "mercur-confirm-return-receive"

export const confirmReturnReceiveWorkflow = createWorkflow(
  confirmReturnReceiveWorkflowId,
  function (
    input: ConfirmReceiveReturnRequestWorkflowInput,
  ): WorkflowResponse<OrderPreviewDTO> {
    const orderReturn = useRemoteQueryStep({
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
    }).config({ name: "return-query" }) as ReturnWithVariantItems

    const order: OrderDTO = useRemoteQueryStep({
      entry_point: "orders",
      fields: ["id", "version", "canceled_at"],
      variables: { id: orderReturn.order_id },
      list: false,
      throw_if_key_not_found: true,
    }).config({ name: "order-query" })

    const orderChange: OrderChangeDTO = useRemoteQueryStep({
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

    const { updateReturnItem, returnedQuantityByVariant, updateReturn } =
      transform({ orderChange, orderReturn }, (data) => {
        const returnedQuantityByVariant: Record<string, BigNumberInput> = {}

        const retItems: ReturnItemWithVariant[] = data.orderReturn.items ?? []
        const received: OrderChangeActionDTO[] = []

        const variantByLineItemId = new Map<string, string>()
        for (const ri of retItems) {
          const lineItemId = ri.item?.id
          const variantId = ri.item?.variant_id
          if (lineItemId && variantId) {
            variantByLineItemId.set(lineItemId, variantId)
          }
        }

        data.orderChange.actions.forEach((act) => {
          if (
            [
              ChangeActionType.RECEIVE_RETURN_ITEM,
              ChangeActionType.RECEIVE_DAMAGED_RETURN_ITEM,
            ].includes(act.action as ChangeActionType)
          ) {
            received.push(act)

            if (act.action === ChangeActionType.RECEIVE_RETURN_ITEM) {
              const lineItemId = act.details!.reference_id as string
              const variantId = variantByLineItemId.get(lineItemId)
              if (!variantId) {
                return
              }
              const current = returnedQuantityByVariant[variantId] ?? 0
              returnedQuantityByVariant[variantId] = MathBN.add(
                current,
                act.details!.quantity as number,
              ) as BigNumberInput
            }
          }
        })

        const itemMap = retItems.reduce(
          (acc, item) => {
            acc[item.item_id] = item.id
            return acc
          },
          {} as Record<string, string>,
        )

        const itemUpdates: Record<
          string,
          {
            id: string
            received_quantity: BigNumberInput
            damaged_quantity: BigNumberInput
          }
        > = {}
        received.forEach((act) => {
          const itemId = act.details!.reference_id as string
          if (itemUpdates[itemId]) {
            itemUpdates[itemId].received_quantity = MathBN.add(
              itemUpdates[itemId].received_quantity,
              act.details!.quantity as BigNumberInput,
            ) as BigNumberInput

            if (act.action === ChangeActionType.RECEIVE_DAMAGED_RETURN_ITEM) {
              itemUpdates[itemId].damaged_quantity = MathBN.add(
                itemUpdates[itemId].damaged_quantity,
                act.details!.quantity as BigNumberInput,
              ) as BigNumberInput
            }
            return
          }

          itemUpdates[itemId] = {
            id: itemMap[itemId],
            received_quantity: act.details!.quantity as BigNumberInput,
            damaged_quantity:
              act.action === ChangeActionType.RECEIVE_DAMAGED_RETURN_ITEM
                ? (act.details!.quantity as BigNumberInput)
                : (0 as BigNumberInput),
          }
        })

        const hasReceivedAllItems = retItems.every((item) => {
          const itemId = item.item_id
          const received: BigNumberInput = itemUpdates[itemId]
            ? itemUpdates[itemId].received_quantity
            : (item.received_quantity ?? (0 as BigNumberInput))
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
      updateReturnItemsStep(updateReturnItem as never),
      confirmOrderChangesStep({
        changes: [orderChange],
        orderId: order.id,
        confirmed_by: input.confirmed_by,
      }),
      adjustInventoryLevelsStep(inventoryAdjustment),
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
        },
      }),
    )

    return new WorkflowResponse(previewOrderChangeStep(order.id))
  },
)
