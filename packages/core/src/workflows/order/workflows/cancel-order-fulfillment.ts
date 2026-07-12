import {
  AdditionalData,
  BigNumberInput,
  FulfillmentDTO,
  OrderDTO,
  OrderWorkflow,
  ReservationItemDTO,
} from "@medusajs/framework/types"
import {
  arrayDifference,
  MathBN,
  MedusaError,
  OrderStatus,
  OrderWorkflowEvents,
  Modules,
} from "@medusajs/framework/utils"
import {
  createWorkflow,
  createHook,
  createStep,
  parallelize,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  adjustInventoryLevelsStep,
  cancelFulfillmentWorkflow,
  cancelOrderFulfillmentStep,
  createReservationsStep,
  emitEventStep,
  updateReservationsStep,
  useQueryGraphStep,
  useRemoteQueryStep,
} from "@medusajs/medusa/core-flows"
import {
  buildVariantInventoryLinkMap,
  VariantInventoryLink,
  VariantInventoryRow,
} from "../utils"

export const cancelOrderFulfillmentValidateOrderStepId =
  "mercur-cancel-order-fulfillment-validate-order"

export const cancelOrderFulfillmentValidateOrderStep = createStep(
  cancelOrderFulfillmentValidateOrderStepId,
  ({
    order,
    input,
  }: {
    order: OrderDTO & { fulfillments: FulfillmentDTO[] }
    input: OrderWorkflow.CancelOrderFulfillmentWorkflowInput
  }) => {
    if (order.status === OrderStatus.CANCELED) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Order with id ${order.id} has been canceled.`,
      )
    }

    const fulfillment = order.fulfillments.find(
      (f) => f.id === input.fulfillment_id,
    )
    if (!fulfillment) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Fulfillment with id ${input.fulfillment_id} not found in the order`,
      )
    }
    if (fulfillment.canceled_at) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "The fulfillment is already canceled",
      )
    }
    if (fulfillment.shipped_at) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "The fulfillment has already been shipped. Shipped fulfillments cannot be canceled",
      )
    }

    const orderItemIds = order.items?.map((i) => i.id) ?? []
    const fulfillmentItemIds = fulfillment.items.map(
      (i) => i.line_item_id as string,
    )
    const missing = arrayDifference(fulfillmentItemIds, orderItemIds)
    if (missing.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Items with ids ${missing.join(", ")} does not exist in order with id ${order.id}.`,
      )
    }
  },
)

function prepareCancelOrderFulfillmentData({
  order,
  fulfillment,
  inventoryByLineItem,
}: {
  order: OrderDTO
  fulfillment: FulfillmentDTO
  inventoryByLineItem: Record<string, Record<string, VariantInventoryLink>>
}) {
  const lineItemIds = Array.from(
    new Set(fulfillment.items.map((i) => i.line_item_id as string)),
  )

  return {
    order_id: order.id,
    reference: Modules.FULFILLMENT,
    reference_id: fulfillment.id,
    items: lineItemIds.map((lineItemId) => {
      const fitem = fulfillment.items.find(
        (i) => i.line_item_id === lineItemId,
      )!
      const linksByInventoryItem = inventoryByLineItem[lineItemId]
      const link = linksByInventoryItem?.[fitem.inventory_item_id as string]

      let quantity: BigNumberInput = fitem.quantity
      if (link?.required_quantity && link.required_quantity > 1) {
        quantity = MathBN.div(quantity, link.required_quantity) as BigNumberInput
      }

      return {
        id: lineItemId,
        quantity,
      }
    }),
  }
}

function prepareInventoryUpdate({
  fulfillment,
  reservations,
  inventoryByLineItem,
}: {
  fulfillment: FulfillmentDTO
  reservations: ReservationItemDTO[]
  inventoryByLineItem: Record<string, Record<string, VariantInventoryLink>>
}) {
  const inventoryAdjustment: {
    inventory_item_id: string
    location_id: string
    adjustment: BigNumberInput
  }[] = []
  const toCreate: {
    inventory_item_id: string
    location_id: string
    quantity: BigNumberInput
    line_item_id: string
    allow_backorder: boolean
  }[] = []
  const toUpdate: {
    id: string
    quantity: BigNumberInput
  }[] = []

  for (const fitem of fulfillment.items) {
    if (!fitem.inventory_item_id) {
      continue
    }

    const linksByInventoryItem =
      inventoryByLineItem[fitem.line_item_id as string]
    const link = linksByInventoryItem?.[fitem.inventory_item_id as string]
    if (!link) {
      continue
    }

    const reservation = reservations.find(
      (r) =>
        r.inventory_item_id === fitem.inventory_item_id &&
        r.line_item_id === fitem.line_item_id,
    )

    if (!reservation) {
      toCreate.push({
        inventory_item_id: link.inventory_item_id,
        location_id: fulfillment.location_id,
        quantity: fitem.quantity,
        line_item_id: fitem.line_item_id as string,
        allow_backorder: false,
      })
    } else {
      toUpdate.push({
        id: reservation.id,
        quantity: MathBN.add(
          reservation.quantity,
          fitem.quantity,
        ) as BigNumberInput,
      })
    }

    inventoryAdjustment.push({
      inventory_item_id: fitem.inventory_item_id as string,
      location_id: fulfillment.location_id,
      adjustment: fitem.quantity,
    })
  }

  return { toCreate, toUpdate, inventoryAdjustment }
}

export type CancelOrderFulfillmentWorkflowInput =
  OrderWorkflow.CancelOrderFulfillmentWorkflowInput & AdditionalData

export const cancelOrderFulfillmentWorkflowId = "mercur-cancel-order-fulfillment"

export const cancelOrderFulfillmentWorkflow = createWorkflow(
  cancelOrderFulfillmentWorkflowId,
  (input: WorkflowData<CancelOrderFulfillmentWorkflowInput>) => {
    const { data: order } = useQueryGraphStep({
      entity: "order",
      filters: { id: input.order_id },
      fields: [
        "id",
        "status",
        "items.id",
        "items.quantity",
        "items.variant.id",
        "items.variant.inventory_items.inventory_item_id",
        "items.variant.inventory_items.required_quantity",
        "items.variant.inventory_items.inventory.id",
        "fulfillments.id",
        "fulfillments.canceled_at",
        "fulfillments.shipped_at",
        "fulfillments.location_id",
        "fulfillments.items.id",
        "fulfillments.items.quantity",
        "fulfillments.items.line_item_id",
        "fulfillments.items.inventory_item_id",
      ],
      options: { throwIfKeyNotFound: true, isList: false },
    }).config({ name: "get-order" })

    cancelOrderFulfillmentValidateOrderStep({ order, input })

    const fulfillment = transform({ input, order }, ({ input, order }) => {
      return order.fulfillments.find((f) => f.id === input.fulfillment_id)!
    })

    const lineItemIds = transform({ fulfillment }, ({ fulfillment }) => {
      return Array.from(
        new Set(fulfillment.items.map((i) => i.line_item_id as string)),
      )
    })

    const reservations = useRemoteQueryStep({
      entry_point: "reservations",
      fields: [
        "id",
        "line_item_id",
        "quantity",
        "inventory_item_id",
        "location_id",
      ],
      variables: { filters: { line_item_id: lineItemIds } },
    }).config({ name: "get-reservations" })

    const inventoryByLineItem = transform({ order }, ({ order }) => {
      const items = (order.items ?? []) as Array<{
        id: string
        variant?: VariantInventoryRow | null
      }>
      const variants = items
        .map((i) => i.variant)
        .filter((v): v is VariantInventoryRow => !!v)
      const variantInventoryByVariantId = buildVariantInventoryLinkMap(variants)

      const byLineItem: Record<string, Record<string, VariantInventoryLink>> = {}
      for (const item of items) {
        byLineItem[item.id] = variantInventoryByVariantId[item.variant?.id ?? ""] ?? {}
      }
      return byLineItem
    })

    const cancelOrderFulfillmentData = transform(
      { order, fulfillment, inventoryByLineItem },
      prepareCancelOrderFulfillmentData,
    )

    const { toCreate, toUpdate, inventoryAdjustment } = transform(
      { fulfillment, reservations, inventoryByLineItem },
      prepareInventoryUpdate,
    )

    adjustInventoryLevelsStep(inventoryAdjustment)

    const eventData = transform({ order, fulfillment, input }, (data) => {
      return {
        order_id: data.order.id,
        fulfillment_id: data.fulfillment.id,
        no_notification: data.input.no_notification,
      }
    })

    parallelize(
      cancelOrderFulfillmentStep(cancelOrderFulfillmentData),
      createReservationsStep(toCreate),
      updateReservationsStep(toUpdate),
      emitEventStep({
        eventName: OrderWorkflowEvents.FULFILLMENT_CANCELED,
        data: eventData,
      }),
    )

    cancelFulfillmentWorkflow.runAsStep({
      input: { id: input.fulfillment_id },
    })

    const orderFulfillmentCanceled = createHook("orderFulfillmentCanceled", {
      fulfillment,
      additional_data: input.additional_data,
    })

    return new WorkflowResponse(void 0, {
      hooks: [orderFulfillmentCanceled],
    })
  },
)
