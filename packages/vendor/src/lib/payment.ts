import { AdminPaymentCollection } from "@medusajs/types"

export const getTotalCaptured = (
  paymentCollections: AdminPaymentCollection[]
) =>
  paymentCollections.reduce((acc, paymentCollection) => {
    acc =
      acc +
      ((paymentCollection.captured_amount ?? 0) -
        (paymentCollection.refunded_amount ?? 0))
    return acc
  }, 0)

export const getTotalPending = (paymentCollections: AdminPaymentCollection[]) =>
  paymentCollections
    .filter((pc) => pc.status !== "canceled")
    .reduce((acc, paymentCollection) => {
      acc +=
        paymentCollection.amount - (paymentCollection.captured_amount ?? 0)

      return acc
    }, 0)
