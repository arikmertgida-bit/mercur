import {
  AdditionalData,
  BigNumberInput,
  CreateFulfillmentDTO,
  FulfillmentDTO,
  FulfillmentWorkflow,
  OrderWorkflow,
  RegisterOrderFulfillmentDTO,
} from "@medusajs/framework/types"
import {
  arrayDifference,
  MathBN,
  MedusaError,
  Modules,
  OrderStatus,
  OrderWorkflowEvents,
} from "@medusajs/framework/utils"
import {
  createWorkflow,
  createHook,
  createStep,
  parallelize,
  transform,
  WorkflowData,
  WorkflowResponse,
  type Hook,
  type ReturnWorkflow,
} from "@medusajs/framework/workflows-sdk"
import {
  adjustInventoryLevelsStep,
  createFulfillmentWorkflow,
  createRemoteLinkStep,
  deleteReservationsStep,
  emitEventStep,
  registerOrderFulfillmentStep,
  updateReservationsStep,
  useQueryGraphStep,
  useRemoteQueryStep,
} from "@medusajs/medusa/core-flows"
import { z } from "zod"
import {
  buildVariantInventoryLinkMap,
  VariantInventoryLink,
  VariantInventoryRow,
  VariantInventoryRowSchema,
} from "../utils"
import { InventoryWorkflowEvents } from "../../events"
import { AddressRowSchema } from "../../../utils/address-row"
import { ensureDefined } from "../../../utils/ensure-defined"
import {
  GraphBigNumberSchema,
  parseGraphRow,
  parseGraphRows,
} from "../../../utils/graph-rows"
import { JsonRecordSchema } from "../../../utils/json-schema"

const OrderItemRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  variant_id: z.string().nullish(),
  variant_title: z.string().nullish(),
  variant_sku: z.string().nullish(),
  variant_barcode: z.string().nullish(),
  requires_shipping: z.boolean(),
  quantity: GraphBigNumberSchema,
  variant: VariantInventoryRowSchema.nullish(),
})

type OrderItemRow = z.infer<typeof OrderItemRowSchema>

const OrderRowSchema = z.object({
  id: z.string(),
  status: z.enum(OrderStatus),
  items: z.array(OrderItemRowSchema),
  // Spread into the delivery address the way Medusa's own workflow does.
  shipping_address: AddressRowSchema.nullish(),
  shipping_methods: z
    .array(
      z.object({
        shipping_option_id: z.string().nullish(),
        data: JsonRecordSchema.nullish(),
      }),
    )
    .nullish(),
})

type OrderRow = z.infer<typeof OrderRowSchema>

const ShippingOptionRowSchema = z.object({
  id: z.string(),
  provider_id: z.string(),
  shipping_profile_id: z.string(),
  service_zone: z
    .object({
      fulfillment_set: z
        .object({ location: z.object({ id: z.string() }).nullish() })
        .nullish(),
    })
    .nullish(),
})

type ShippingOptionRow = z.infer<typeof ShippingOptionRowSchema>

const ReservationRowSchema = z.object({
  id: z.string(),
  line_item_id: z.string().nullish(),
  quantity: GraphBigNumberSchema,
  inventory_item_id: z.string(),
  location_id: z.string(),
})

type ReservationRow = z.infer<typeof ReservationRowSchema>

type InputItem = OrderWorkflow.CreateOrderFulfillmentWorkflowInput["items"][number]

// `createFulfillmentWorkflow` forwards its input to the fulfillment module,
// which persists `requires_shipping`; Medusa's workflow input type omits it.
type FulfillmentInput = FulfillmentWorkflow.CreateFulfillmentWorkflowInput &
  Pick<CreateFulfillmentDTO, "requires_shipping">

function buildReservationsMap(
  reservations: ReservationRow[],
): Map<string, ReservationRow[]> {
  const map = new Map<string, ReservationRow[]>()
  for (const reservation of reservations) {
    const key = reservation.line_item_id
    if (!key) continue
    const list = map.get(key)
    if (list) {
      list.push(reservation)
    } else {
      map.set(key, [reservation])
    }
  }
  return map
}

export const createOrderFulfillmentValidateOrderStepId =
  "mercur-create-order-fulfillment-validate-order"

export const createOrderFulfillmentValidateOrderStep = createStep(
  createOrderFulfillmentValidateOrderStepId,
  ({
    order,
    inputItems,
  }: {
    order: OrderRow
    inputItems: OrderWorkflow.CreateOrderFulfillmentWorkflowInput["items"]
  }) => {
    if (!inputItems.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No items to fulfill",
      )
    }

    if (order.status === OrderStatus.CANCELED) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Order with id ${order.id} has been canceled.`,
      )
    }

    const orderItemIds = order.items.map((i) => i.id)
    const inputItemIds = inputItems.map((i) => i.id)
    const missing = arrayDifference(inputItemIds, orderItemIds)
    if (missing.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Items with ids ${missing.join(", ")} does not exist in order with id ${order.id}.`,
      )
    }

    const orderItemsById = new Map<string, OrderItemRow>(
      order.items.map((item) => [item.id, item]),
    )
    const withShipping: string[] = []
    const withoutShipping: string[] = []
    for (const inputItem of inputItems) {
      const orderItem = orderItemsById.get(inputItem.id)
      if (!orderItem) continue
      if (orderItem.requires_shipping) {
        withShipping.push(orderItem.id)
      } else {
        withoutShipping.push(orderItem.id)
      }
    }
    if (withShipping.length && withoutShipping.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Fulfillment can only be created entirely with items with shipping or items without shipping. Split this request into 2 fulfillments.",
      )
    }
  },
)

function prepareRegisterOrderFulfillmentData({
  order,
  fulfillment,
  input,
  inputItemsMap,
  itemsList,
}: {
  order: OrderRow
  fulfillment: { id: string }
  input: OrderWorkflow.CreateOrderFulfillmentWorkflowInput & AdditionalData
  inputItemsMap: Record<string, InputItem>
  itemsList?: { id: string; quantity: BigNumberInput }[]
}): RegisterOrderFulfillmentDTO {
  const items = itemsList ?? order.items
  return {
    order_id: order.id,
    reference: Modules.FULFILLMENT,
    reference_id: fulfillment.id,
    created_by: input.created_by,
    items: items.map((i) => {
      const inputQuantity = inputItemsMap[i.id]?.quantity
      return {
        id: i.id,
        quantity: inputQuantity ?? i.quantity,
      }
    }),
  }
}

function prepareFulfillmentData({
  order,
  orderSnapshot,
  orderItems,
  input,
  shippingOption,
  shippingMethod,
  reservations,
  variantInventoryByVariantId,
}: {
  order: OrderRow
  orderSnapshot: FulfillmentWorkflow.CreateFulfillmentOrderWorkflowDTO
  orderItems: OrderItemRow[]
  input: OrderWorkflow.CreateOrderFulfillmentWorkflowInput
  shippingOption: ShippingOptionRow
  shippingMethod: { data?: FulfillmentWorkflow.CreateFulfillmentWorkflowInput["data"] }
  reservations: ReservationRow[]
  variantInventoryByVariantId: Record<string, Record<string, VariantInventoryLink>>
}): { input: FulfillmentInput } {
  const fulfillableItems = input.items
  const orderItemsMap = new Map<string, OrderItemRow>(
    orderItems.map((i) => [i.id, i]),
  )
  const getOrderItem = (id: string): OrderItemRow =>
    ensureDefined(orderItemsMap.get(id), `Order item ${id}`)

  const reservationItemMap = buildReservationsMap(reservations)

  const someItemsRequireShipping = fulfillableItems.length
    ? fulfillableItems.some((item) => getOrderItem(item.id).requires_shipping)
    : true

  const fulfillmentItems = fulfillableItems.flatMap(
    (i): FulfillmentWorkflow.CreateFulfillmentItemWorkflowDTO[] => {
      const orderItem = getOrderItem(i.id)
      const reservations = reservationItemMap.get(i.id)
      const inventoryByInventoryItem = orderItem.variant_id
        ? variantInventoryByVariantId[orderItem.variant_id]
        : undefined

      if (!reservations?.length) {
        return [
          {
            line_item_id: i.id,
            inventory_item_id: undefined,
            quantity: MathBN.convert(i.quantity).toNumber(),
            title: orderItem.variant_title ?? orderItem.title,
            sku: orderItem.variant_sku || "",
            barcode: orderItem.variant_barcode || "",
          },
        ]
      }

      return reservations.map((r) => {
        const link = inventoryByInventoryItem?.[r.inventory_item_id]
        const requiredQuantity = link?.required_quantity ?? 1
        return {
          line_item_id: i.id,
          inventory_item_id: r.inventory_item_id,
          quantity: MathBN.mult(requiredQuantity, i.quantity).toNumber(),
          title:
            link?.inventory?.title ||
            orderItem.variant_title ||
            orderItem.title,
          sku: link?.inventory?.sku || orderItem.variant_sku || "",
          barcode: orderItem.variant_barcode || "",
        }
      })
    },
  )

  const locationId =
    input.location_id ||
    shippingOption.service_zone?.fulfillment_set?.location?.id
  if (!locationId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Cannot create fulfillment without stock location, either provide a location or you should link the shipping option ${shippingOption.id} to a stock location.`,
    )
  }

  const { id: _addressId, ...deliveryAddress } = order.shipping_address ?? {}

  return {
    input: {
      location_id: locationId,
      provider_id: shippingOption.provider_id,
      shipping_option_id: shippingOption.id,
      order: orderSnapshot,
      data: shippingMethod.data,
      items: fulfillmentItems,
      requires_shipping: someItemsRequireShipping,
      labels: input.labels ?? [],
      delivery_address: deliveryAddress,
      created_by: input.created_by,
      packed_at: new Date(),
      metadata: input.metadata,
    },
  }
}

type InventoryUpdate = {
  toDelete: string[]
  toUpdate: {
    id: string
    quantity: BigNumberInput
    location_id: string
  }[]
  inventoryAdjustment: {
    inventory_item_id: string
    location_id: string
    adjustment: BigNumberInput
  }[]
}

function prepareInventoryUpdate({
  reservations,
  orderItems,
  input,
  inputItemsMap,
  variantInventoryByVariantId,
}: {
  reservations: ReservationRow[]
  orderItems: OrderItemRow[]
  input: OrderWorkflow.CreateOrderFulfillmentWorkflowInput
  inputItemsMap: Record<string, InputItem>
  variantInventoryByVariantId: Record<string, Record<string, VariantInventoryLink>>
}): InventoryUpdate {
  const toDelete: InventoryUpdate["toDelete"] = []
  const toUpdate: InventoryUpdate["toUpdate"] = []
  const inventoryAdjustment: InventoryUpdate["inventoryAdjustment"] = []

  const reservationMap = buildReservationsMap(reservations)
  const itemsToFulfill = orderItems.filter((i) => i.id in inputItemsMap)

  for (const item of itemsToFulfill) {
    const reservations = reservationMap.get(item.id)
    const inventoryByInventoryItem = item.variant_id
      ? variantInventoryByVariantId[item.variant_id]
      : undefined

    if (!reservations?.length) {
      continue
    }

    const inputQuantity = inputItemsMap[item.id]?.quantity ?? item.quantity

    reservations.forEach((reservation) => {
      const link = inventoryByInventoryItem?.[reservation.inventory_item_id]
      const requiredQuantity = link?.required_quantity ?? 1

      const adjustmentQuantity = MathBN.mult(inputQuantity, requiredQuantity)
      const remainingReservationQuantity = MathBN.sub(
        reservation.quantity,
        adjustmentQuantity,
      )

      if (MathBN.lt(remainingReservationQuantity, 0)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Quantity to fulfill exceeds the reserved quantity for the item: ${item.id}`,
        )
      }

      const locationId = input.location_id ?? reservation.location_id

      inventoryAdjustment.push({
        inventory_item_id: reservation.inventory_item_id,
        location_id: locationId,
        adjustment: MathBN.mult(adjustmentQuantity, -1),
      })

      if (MathBN.eq(remainingReservationQuantity, 0)) {
        toDelete.push(reservation.id)
      } else {
        toUpdate.push({
          id: reservation.id,
          quantity: remainingReservationQuantity,
          location_id: locationId,
        })
      }
    })
  }

  return { toDelete, toUpdate, inventoryAdjustment }
}

export type CreateOrderFulfillmentWorkflowInput =
  OrderWorkflow.CreateOrderFulfillmentWorkflowInput & AdditionalData

export type CreateOrderFulfillmentWorkflowHooks = [
  Hook<
    "fulfillmentCreated",
    {
      fulfillment: FulfillmentDTO
      additional_data: AdditionalData["additional_data"]
    },
    void
  >,
]

export const createOrderFulfillmentWorkflowId = "mercur-create-order-fulfillment"

export const createOrderFulfillmentWorkflow: ReturnWorkflow<
  CreateOrderFulfillmentWorkflowInput,
  FulfillmentDTO,
  CreateOrderFulfillmentWorkflowHooks
> = createWorkflow(
  createOrderFulfillmentWorkflowId,
  (input: WorkflowData<CreateOrderFulfillmentWorkflowInput>) => {
    const { data: orderSnapshot } = useQueryGraphStep({
      entity: "order",
      filters: { id: input.order_id },
      fields: [
        "id",
        "display_id",
        "custom_display_id",
        "status",
        "customer_id",
        "customer.*",
        "sales_channel_id",
        "sales_channel.*",
        "region_id",
        "region.*",
        "currency_code",
        "items.*",
        "items.variant.id",
        "items.variant.inventory_items.inventory_item_id",
        "items.variant.inventory_items.required_quantity",
        "items.variant.inventory_items.inventory.id",
        "items.variant.inventory_items.inventory.title",
        "items.variant.inventory_items.inventory.sku",
        "items.variant.product.id",
        "items.variant.product.shipping_profile.id",
        "items.variant.weight",
        "items.variant.length",
        "items.variant.height",
        "items.variant.width",
        "items.variant.material",
        "items.variant_title",
        "items.variant.upc",
        "items.variant.sku",
        "items.variant.barcode",
        "items.variant.hs_code",
        "items.variant.origin_country",
        "items.variant.product.origin_country",
        "items.variant.product.hs_code",
        "items.variant.product.mid_code",
        "items.variant.product.material",
        "items.tax_lines.rate",
        "metadata",
        "subtotal",
        "discount_total",
        "tax_total",
        "item_total",
        "shipping_total",
        "total",
        "created_at",
        "shipping_address.*",
        "shipping_methods.id",
        "shipping_methods.shipping_option_id",
        "shipping_methods.data",
        "shipping_methods.amount",
      ],
      options: { throwIfKeyNotFound: true, isList: false },
    }).config({ name: "get-order" })

    // The full snapshot goes to the fulfillment provider unchanged; only the
    // fields this workflow reads are validated.
    const order = transform({ orderSnapshot }, ({ orderSnapshot }) =>
      parseGraphRow(OrderRowSchema, orderSnapshot),
    )

    createOrderFulfillmentValidateOrderStep({ order, inputItems: input.items })

    const orderItems = transform({ order, input }, ({ order, input }) =>
      input.items_list
        ? parseGraphRows(OrderItemRowSchema, input.items_list)
        : order.items,
    )

    const inputItemsMap = transform(input, ({ items }) => {
      const map: Record<string, InputItem> = {}
      for (const item of items) {
        map[item.id] = item
      }
      return map
    })

    const shippingOptionId = transform({ order, input }, (data) => {
      return (
        data.input.shipping_option_id ??
        data.order.shipping_methods?.[0]?.shipping_option_id
      )
    })

    const shippingMethod = transform({ order, shippingOptionId }, (data) => {
      return {
        data: data.order.shipping_methods?.find(
          (sm) => sm.shipping_option_id === data.shippingOptionId,
        )?.data,
      }
    })

    const shippingOptionRow = useRemoteQueryStep({
      entry_point: "shipping_options",
      fields: [
        "id",
        "provider_id",
        "service_zone.fulfillment_set.location.id",
        "shipping_profile_id",
      ],
      variables: { id: shippingOptionId },
      list: false,
    }).config({ name: "get-shipping-option" })

    const shippingOption = transform(
      { shippingOptionRow },
      ({ shippingOptionRow }) =>
        parseGraphRow(ShippingOptionRowSchema, shippingOptionRow),
    )

    const lineItemIds = transform(
      { orderItems, inputItemsMap },
      ({ orderItems, inputItemsMap }) => {
        return orderItems
          .map((i) => i.id)
          .filter((i) => i in inputItemsMap)
      },
    )

    const reservationRows = useRemoteQueryStep({
      entry_point: "reservations",
      fields: [
        "id",
        "line_item_id",
        "quantity",
        "inventory_item_id",
        "location_id",
      ],
      variables: { filter: { line_item_id: lineItemIds } },
    }).config({ name: "get-reservations" })

    const reservations = transform({ reservationRows }, ({ reservationRows }) =>
      parseGraphRows(ReservationRowSchema, reservationRows),
    )

    const variantInventoryByVariantId = transform(
      { orderItems },
      ({ orderItems }) => {
        const variants = orderItems
          .map((i) => i.variant)
          .filter((v): v is VariantInventoryRow => !!v)
        return buildVariantInventoryLinkMap(variants)
      },
    )

    const fulfillmentData = transform(
      {
        order,
        orderSnapshot,
        orderItems,
        input,
        shippingOption,
        shippingMethod,
        reservations,
        variantInventoryByVariantId,
      },
      prepareFulfillmentData,
    )

    const fulfillment = createFulfillmentWorkflow.runAsStep(fulfillmentData)

    const registerOrderFulfillmentData = transform(
      {
        order,
        fulfillment,
        input,
        inputItemsMap,
        itemsList: input.items,
      },
      prepareRegisterOrderFulfillmentData,
    )

    const link = transform(
      { order_id: input.order_id, fulfillment },
      (data) => {
        return [
          {
            [Modules.ORDER]: { order_id: data.order_id },
            [Modules.FULFILLMENT]: { fulfillment_id: data.fulfillment.id },
          },
        ]
      },
    )

    const { toDelete, toUpdate, inventoryAdjustment } = transform(
      {
        reservations,
        orderItems,
        input,
        inputItemsMap,
        variantInventoryByVariantId,
      },
      prepareInventoryUpdate,
    )

    adjustInventoryLevelsStep(inventoryAdjustment)

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
      registerOrderFulfillmentStep(registerOrderFulfillmentData),
      createRemoteLinkStep(link),
      updateReservationsStep(toUpdate),
      deleteReservationsStep(toDelete),
      emitEventStep({
        eventName: OrderWorkflowEvents.FULFILLMENT_CREATED,
        data: {
          order_id: input.order_id,
          fulfillment_id: fulfillment.id,
          no_notification: input.no_notification,
        },
      }),
      // Stock physically decrements here (adjustInventoryLevelsStep above,
      // already resolved) — this is the fulfillment-side counterpart to the
      // reservation-side emit in complete-cart-with-split-orders.ts.
      emitEventStep({
        eventName: InventoryWorkflowEvents.LEVEL_CHANGED,
        data: changedInventoryItemIds,
      }).config({
        name: "inventory-level-changed-event",
      }),
    )

    const fulfillmentCreated = createHook("fulfillmentCreated", {
      fulfillment,
      additional_data: input.additional_data,
    })

    return new WorkflowResponse(fulfillment, {
      hooks: [fulfillmentCreated],
    })
  },
)
