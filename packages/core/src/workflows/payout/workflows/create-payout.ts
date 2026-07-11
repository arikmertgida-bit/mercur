import { createRemoteLinkStep, useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { WorkflowData, WorkflowResponse, createWorkflow, transform } from "@medusajs/framework/workflows-sdk"
import { BigNumberInput } from "@medusajs/framework/types"
import { MathBN, MedusaError } from "@medusajs/framework/utils"
import { MercurModules } from "@mercurjs/types"

import { createPayoutStep } from "../steps"

type CreatePayoutWorkflowInput = {
  order_id: string
}

export const createPayoutWorkflowId = "create-payout"

type OrderForPayout = {
  id: string
  currency_code: string
  total: BigNumberInput
  items?: Array<{ id: string }>
  shipping_methods?: Array<{ id: string }>
  seller?: {
    id: string
    payout_account?: { id: string }
  }
}

type CommissionLineAmount = { amount?: BigNumberInput }

export const createPayoutWorkflow = createWorkflow(
  createPayoutWorkflowId,
  function (input: WorkflowData<CreatePayoutWorkflowInput>) {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        'id',
        'currency_code',
        'total',
        'seller.*',
        'seller.payout_account.*',
        'items.*',
        'shipping_methods.*',
      ],
      filters: { id: input.order_id },
      options: { throwIfKeyNotFound: true },
    }).config({ name: "fetch-order" })

    const order = transform({ orders }, ({ orders }) => orders[0] as OrderForPayout)

    const commissionFilters = transform({ order }, ({ order }) => ({
      $or: [
        { item_id: (order.items ?? []).map((item) => item.id) },
        {
          shipping_method_id: (order.shipping_methods ?? []).map(
            (method) => method.id
          ),
        },
      ],
    }))

    // The order→commission links resolve for items but not shipping methods,
    // so read the order's commission lines (item + shipping) straight from
    // the commission module via query.
    const { data: commissionLines } = useQueryGraphStep({
      entity: "commission_line",
      fields: ["amount"],
      filters: commissionFilters,
    }).config({ name: "fetch-commission-lines" })

    const payoutInput = transform(
      { order, commissionLines },
      ({ order, commissionLines }) => {
        const payoutAccountId = order.seller?.payout_account?.id
        const sellerId = order.seller?.id

        if (!payoutAccountId) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            `Seller does not have a payout account`
          )
        }

        const totalCommission = (commissionLines as CommissionLineAmount[] ?? []).reduce(
          (acc, line) => MathBN.add(acc, line?.amount ?? 0),
          0 as BigNumberInput
        )

        const amount = Number(MathBN.sub(order.total, totalCommission))

        return {
          account_id: payoutAccountId,
          seller_id: sellerId,
          amount,
          currency_code: order.currency_code,
          data: {
            order_id: order.id,
            seller_id: sellerId
          },
          context: {
            idempotency_key: order.id,
          },
        }
      }
    )

    const payout = createPayoutStep({
      account_id: payoutInput.account_id,
      amount: payoutInput.amount,
      currency_code: payoutInput.currency_code,
      data: payoutInput.data,
      context: payoutInput.context,
    })

    createRemoteLinkStep([
      {
        [MercurModules.PAYOUT]: {
          payout_id: payout.id,
        },
        [MercurModules.SELLER]: {
          seller_id: payoutInput.seller_id,
        },
      },
    ])

    return new WorkflowResponse(payout)
  }
)
