import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useCan, useExtensionActivity } from "@mercurjs/dashboard-shared"
import {
  AdminClaim,
  AdminExchange,
  AdminOrderLineItem,
  AdminReturn,
} from "@medusajs/types"
import { HttpTypes } from "@mercurjs/types"
import { Text } from "@medusajs/ui"
import { ReactNode } from "react"
import { By } from "@components/common/user-link"
import {
  useOrderChanges,
} from "@hooks/api"
import { useClaims } from "@hooks/api/claims"
import { useExchanges } from "@hooks/api/exchanges"
import { useReturns } from "@hooks/api/returns"
import { getStylizedAmount } from "@lib/money-amount-helpers"
import { getFormattedAddress } from "@lib/addresses"
import {
  getChangedAddress,
  getChangedText,
  getOrderUpdateDetails,
} from "@lib/order-change-action"
import ChangeDetailsTooltip from "../change-details-tooltip"
import { FulfillmentCreatedBody } from "../components"
import { ReturnBody } from "../components"
import { ClaimBody } from "../components"
import { ExchangeBody } from "../components"
import { OrderEditBody } from "../components"
import { TransferOrderRequestBody } from "../components"

/**
 * Order Changes that are not related to RMA flows
 */


export type Activity = {
  title: string | ReactNode
  timestamp: string | Date | null
  children?: ReactNode
  itemsToSend?: AdminClaim["additional_items"] | AdminExchange["additional_items"]
  itemsToReturn?: AdminReturn["items"]
  itemsMap?: Map<string, AdminOrderLineItem>
}

export const useActivityItems = (order: HttpTypes.VendorOrder): Activity[] => {
  const { t, i18n } = useTranslation()
  const extensionActivity = useExtensionActivity("order", order)

  const { order_changes: orderChanges = [] } = useOrderChanges(order.id)

  

  const itemsMap = useMemo(() => {
    return new Map<string, AdminOrderLineItem>(
      order?.items?.map((i) => [i.id, i])
    )
  }, [order.items])

  const canViewReturns = useCan("orders.returns")

  const { returns = [] } = useReturns(
    {
      order_id: order.id,
      fields: "+received_at,*items",
    },
    { enabled: canViewReturns }
  )
  const { claims = [] } = useClaims(
    {
      order_id: order.id,
      fields: "*additional_items",
    },
    { enabled: canViewReturns }
  )
  const { exchanges = [] } = useExchanges(
    {
      order_id: order.id,
      fields: "*additional_items",
    },
    { enabled: canViewReturns }
  )

  const isLoading = false

  const payments = useMemo(
    () =>
      (order.payment_collections ?? []).flatMap(
        (pc) => pc.payments ?? []
      ),
    [order.payment_collections]
  )

  return useMemo(() => {
    if (isLoading) {
      return []
    }

    const items: Activity[] = []

    for (const payment of payments) {
      const amount = payment.amount ?? payment.authorized_amount ?? 0

      if (!payment.captured_at && !payment.canceled_at && payment.created_at) {
        items.push({
          title: t("orders.activity.events.payment.awaiting"),
          timestamp: payment.created_at,
          children: (
            <Text size="small" className="text-ui-fg-subtle">
              {getStylizedAmount(amount, payment.currency_code)}
            </Text>
          ),
        })
      }

      if (payment.captured_at) {
        items.push({
          title: t("orders.activity.events.payment.captured"),
          timestamp: payment.captured_at,
          children: (
            <Text size="small" className="text-ui-fg-subtle">
              {getStylizedAmount(amount, payment.currency_code)}
            </Text>
          ),
        })
      }

      if (payment.canceled_at) {
        items.push({
          title: t("orders.activity.events.payment.canceled"),
          timestamp: payment.canceled_at,
          children: (
            <Text size="small" className="text-ui-fg-subtle">
              {getStylizedAmount(amount, payment.currency_code)}
            </Text>
          ),
        })
      }

      for (const refund of payment.refunds ?? []) {
        items.push({
          title: t("orders.activity.events.payment.refunded"),
          timestamp: refund.created_at,
          children: (
            <Text size="small" className="text-ui-fg-subtle">
              {getStylizedAmount(refund.amount, payment.currency_code)}
            </Text>
          ),
        })
      }
    }

    for (const fulfillment of order.fulfillments || []) {
      items.push({
        title: t("orders.activity.events.fulfillment.created"),
        timestamp: fulfillment.created_at,
        children: <FulfillmentCreatedBody fulfillment={fulfillment} />,
      })

      if (fulfillment.delivered_at) {
        items.push({
          title: t("orders.activity.events.fulfillment.delivered"),
          timestamp: fulfillment.delivered_at,
          children: <FulfillmentCreatedBody fulfillment={fulfillment} />,
        })
      }

      if (fulfillment.shipped_at) {
        items.push({
          title: t("orders.activity.events.fulfillment.shipped"),
          timestamp: fulfillment.shipped_at,
          children: (
            <FulfillmentCreatedBody fulfillment={fulfillment} isShipment />
          ),
        })
      }

      if (fulfillment.canceled_at) {
        items.push({
          title: t("orders.activity.events.fulfillment.canceled"),
          timestamp: fulfillment.canceled_at,
        })
      }
    }

    const returnMap = new Map<string, AdminReturn>()

    for (const ret of returns) {
      returnMap.set(ret.id, ret)

      if (ret.claim_id || ret.exchange_id) {
        continue
      }

      // Always display created action
      items.push({
        title: t("orders.activity.events.return.created", {
          returnId: ret.id.slice(-7),
        }),
        timestamp: ret.created_at,
        itemsToReturn: ret?.items,
        itemsMap,
        children: <ReturnBody orderReturn={ret} isCreated={!ret.canceled_at} />,
      })

      if (ret.canceled_at) {
        items.push({
          title: t("orders.activity.events.return.canceled", {
            returnId: ret.id.slice(-7),
          }),
          timestamp: ret.canceled_at,
        })
      }

      if (ret.status === "received" || ret.status === "partially_received") {
        items.push({
          title: t("orders.activity.events.return.received", {
            returnId: ret.id.slice(-7),
          }),
          timestamp: ret.received_at,
          itemsToReturn: ret?.items,
          itemsMap,
          children: <ReturnBody orderReturn={ret} isCreated={false} isReceived />,
        })
      }
    }

    for (const claim of claims) {
      const claimReturn = claim.return_id
        ? returnMap.get(claim.return_id)
        : undefined

      items.push({
        title: t(
          claim.canceled_at
            ? "orders.activity.events.claim.canceled"
            : "orders.activity.events.claim.created",
          {
            claimId: claim.id.slice(-7),
          }
        ),
        timestamp: claim.canceled_at || claim.created_at,
        itemsToSend: claim.additional_items,
        itemsToReturn: claimReturn?.items,
        itemsMap,
        children: <ClaimBody claim={claim} claimReturn={claimReturn} />,
      })
    }

    for (const exchange of exchanges) {
      const exchangeReturn = exchange.return_id
        ? returnMap.get(exchange.return_id)
        : undefined

      items.push({
        title: t(
          exchange.canceled_at
            ? "orders.activity.events.exchange.canceled"
            : "orders.activity.events.exchange.created",
          {
            exchangeId: exchange.id.slice(-7),
          }
        ),
        timestamp: exchange.canceled_at || exchange.created_at,
        itemsToSend: exchange.additional_items,
        itemsToReturn: exchangeReturn?.items,
        itemsMap,
        children: (
          <ExchangeBody exchange={exchange} exchangeReturn={exchangeReturn} />
        ),
      })
    }

    for (const edit of orderChanges.filter((oc) => oc.change_type === "edit")) {
      const isConfirmed = edit.status === "confirmed"
      const isPending = edit.status === "pending"

      if (isPending) {
        continue
      }

      const translationKey = `orders.activity.events.edit.${edit.status}` as const
      items.push({
        title: t(translationKey, {
          editId: edit.id.slice(-7),
        }),
        timestamp:
          edit.status === "requested"
            ? edit.requested_at
            : edit.status === "confirmed"
              ? edit.confirmed_at
              : edit.status === "declined"
                ? edit.declined_at
                : edit.status === "canceled"
                  ? edit.canceled_at
                  : edit.created_at,
        children: isConfirmed ? <OrderEditBody edit={edit} /> : null,
      })
    }

    for (const transfer of orderChanges.filter(
      (oc) => oc.change_type === "transfer"
    )) {
      if (transfer.requested_at) {
        items.push({
          title: t(`orders.activity.events.transfer.requested`, {
            transferId: transfer.id.slice(-7),
          }),
          timestamp: transfer.requested_at,
          children: <TransferOrderRequestBody transfer={transfer} />,
        })
      }

      if (transfer.confirmed_at) {
        items.push({
          title: t(`orders.activity.events.transfer.confirmed`, {
            transferId: transfer.id.slice(-7),
          }),
          timestamp: transfer.confirmed_at,
        })
      }
      if (transfer.declined_at) {
        items.push({
          title: t(`orders.activity.events.transfer.declined`, {
            transferId: transfer.id.slice(-7),
          }),
          timestamp: transfer.declined_at,
        })
      }
    }

    // Address/email updates are `update_order` changes (as in Medusa's own
    // order timeline); each one carries a single action describing the field.
    for (const update of orderChanges.filter(
      (oc) => oc.change_type === "update_order"
    )) {
      const details = getOrderUpdateDetails(update.actions[0])
      const updateType = details.type

      if (updateType === "shipping_address") {
        const oldAddress = getChangedAddress(details.old)
        const newAddress = getChangedAddress(details.new)

        items.push({
          title: (
            <ChangeDetailsTooltip
              title={t(`orders.activity.events.update_order.shipping_address`)}
              previous={getFormattedAddress({
                address: oldAddress,
                locale: i18n.language,
              }).join(", ")}
              next={getFormattedAddress({
                address: newAddress,
                locale: i18n.language,
              }).join(", ")}
            />
          ),
          timestamp: update.created_at,
          children: update.created_by ? (
            <div className="text-ui-fg-subtle mt-2 flex gap-x-2 text-sm">
              {t("fields.by")} <By id={update.created_by} />
            </div>
          ) : null,
        })
      }

      if (updateType === "billing_address") {
        const oldAddress = getChangedAddress(details.old)
        const newAddress = getChangedAddress(details.new)

        items.push({
          title: (
            <ChangeDetailsTooltip
              title={t(`orders.activity.events.update_order.billing_address`)}
              previous={getFormattedAddress({
                address: oldAddress,
                locale: i18n.language,
              }).join(", ")}
              next={getFormattedAddress({
                address: newAddress,
                locale: i18n.language,
              }).join(", ")}
            />
          ),
          timestamp: update.created_at,
          children: update.created_by ? (
            <div className="text-ui-fg-subtle mt-2 flex gap-x-2 text-sm">
              {t("fields.by")} <By id={update.created_by} />
            </div>
          ) : null,
        })
      }

      if (updateType === "email") {
        const oldEmail = getChangedText(details.old)
        const newEmail = getChangedText(details.new)

        items.push({
          title: (
            <ChangeDetailsTooltip
              title={t(`orders.activity.events.update_order.email`)}
              previous={oldEmail}
              next={newEmail}
            />
          ),
          timestamp: update.created_at,
          children: update.created_by ? (
            <div className="text-ui-fg-subtle mt-2 flex gap-x-2 text-sm">
              {t("fields.by")} <By id={update.created_by} />
            </div>
          ) : null,
        })
      }
    }

    // for (const note of notes || []) {
    //   items.push({
    //     title: t("orders.activity.events.note.comment"),
    //     timestamp: note.created_at,
    //     children: <NoteBody note={note} />,
    //   })
    // }

    if (order.canceled_at) {
      items.push({
        title: t("orders.activity.events.canceled.title"),
        timestamp: order.canceled_at,
      })
    }

    items.push(...extensionActivity)

    const sortedActivities = items.sort((a, b) => {
      return (
        new Date(b.timestamp ?? 0).getTime() -
        new Date(a.timestamp ?? 0).getTime()
      )
    })

    const createdAt = {
      title: t("orders.activity.events.placed.title"),
      timestamp: order.created_at,
      children: (
        <Text size="small" className="text-ui-fg-subtle">
          {getStylizedAmount(order.total, order.currency_code)}
        </Text>
      ),
    }

    return [...sortedActivities, createdAt]
  /* oxlint-disable react-hooks/exhaustive-deps */
  }, [
	order,
	exchanges,
	orderChanges,
	payments,
	isLoading,
	itemsMap,
	extensionActivity
])
  /* oxlint-enable react-hooks/exhaustive-deps */
}

