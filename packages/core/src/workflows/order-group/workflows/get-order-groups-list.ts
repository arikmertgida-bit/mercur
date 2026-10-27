import { deduplicate } from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"

import { resolveOrderPaymentCollections } from "../../payment/utils/split-order-payment-group"

import {
  getLastFulfillmentStatus,
  getLastPaymentStatus,
  OrderGroupOrderRow,
} from "../utils/aggregate-status"


export type GetOrderGroupsListWorkflowInput = {
  fields: string[]
  variables?: {
    skip?: number
    take?: number
    order?: Record<string, string>
  } & Record<string, string | number | boolean | string[] | Record<string, string> | undefined>
  sellerId?: string | string[]
}

export const getOrderGroupsListWorkflowId = "get-order-groups-list"

export const getOrderGroupsListWorkflow = createWorkflow(
  getOrderGroupsListWorkflowId,
  (
    input: WorkflowData<GetOrderGroupsListWorkflowInput>
  ) => {
    const fields = transform(input, ({ fields, sellerId }) => {
      return deduplicate([
        ...fields,
        "id",
        "orders.id",
        ...(sellerId ? ["orders.seller.id"] : []),
        "orders.status",
        "orders.version",
        "orders.currency_code",
        "orders.items.*",
        "orders.cart.payment_collection.status",
        "orders.cart.payment_collection.amount",
        "orders.cart.payment_collection.captured_amount",
        "orders.cart.payment_collection.refunded_amount",
        "orders.cart.payment_collection.metadata",
        "orders.payment_collections.status",
        "orders.payment_collections.amount",
        "orders.payment_collections.captured_amount",
        "orders.payment_collections.refunded_amount",
        "orders.fulfillments.packed_at",
        "orders.fulfillments.shipped_at",
        "orders.fulfillments.delivered_at",
        "orders.fulfillments.canceled_at",
      ])
    })

    const { data: orderGroups, metadata } = useQueryGraphStep({
      entity: "order_group",
      fields,
      filters: input.variables,
      pagination: {
        skip: input.variables?.skip,
        take: input.variables?.take,
        order: input.variables?.order,
      },
    })

    const aggregatedOrderGroups = transform(
      { orderGroups, metadata, input },
      ({ orderGroups, metadata, input }) => {
        const fields = input.fields
        const requiredPaymentFields = fields.some((f) =>
          f.includes("payment_collections")
        )
        const requiredFulfillmentFields = fields.some((f) =>
          f.includes("fulfillments")
        )

        const sellerIds = input.sellerId
          ? new Set(
              Array.isArray(input.sellerId)
                ? input.sellerId
                : [input.sellerId]
            )
          : undefined

        for (const group of orderGroups) {
          const groupOrders: OrderGroupOrderRow[] | undefined = group.orders
          if (!groupOrders) continue

          const orders = sellerIds
            ? groupOrders.filter((order) =>
                order.seller?.id ? sellerIds.has(order.seller.id) : false
              )
            : groupOrders

          if (sellerIds) {
            group.orders = orders
          }

          for (const order_ of orders) {
            order_.payment_collections = resolveOrderPaymentCollections(order_)

            order_.payment_status = getLastPaymentStatus(order_)
            order_.fulfillment_status = getLastFulfillmentStatus(order_)

            if (!input.fields.some((f) => f.startsWith("orders.cart"))) {
              delete order_.cart
            }

            if (!requiredPaymentFields) {
              Reflect.deleteProperty(order_, "payment_collections")
            }
            if (!requiredFulfillmentFields) {
              Reflect.deleteProperty(order_, "fulfillments")
            }
          }
        }

        return {
          rows: orderGroups,
          metadata,
        }
      }
    )

    return new WorkflowResponse(aggregatedOrderGroups)
  }
)
