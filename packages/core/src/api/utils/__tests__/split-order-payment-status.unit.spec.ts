import type { PaymentCollectionDTO } from "@medusajs/framework/types"

import {
  normalizeOrderPaymentCollections,
  withCartPaymentCollectionFields,
} from "../split-order-payment-status"

type TestOrder = {
  id: string
  currency_code: string
  cart?: {
    id?: string
    payment_collection?: PaymentCollectionDTO | null
  } | null
  payment_collections?: PaymentCollectionDTO[]
}

const cartPaymentCollection: PaymentCollectionDTO = {
  id: "pay_col_cart",
  currency_code: "try",
  amount: 100,
  status: "authorized",
  payment_providers: [],
  metadata: null,
}

const buildOrder = (): TestOrder => ({
  id: "order_1",
  currency_code: "try",
  cart: { id: "cart_1", payment_collection: cartPaymentCollection },
  payment_collections: [],
})

describe("normalizeOrderPaymentCollections", () => {
  it("drops the cart that was only loaded for its payment collection", () => {
    const order = normalizeOrderPaymentCollections(buildOrder(), [
      "id",
      "cart.payment_collection.*",
    ])

    expect(order.cart).toBeUndefined()
    expect(order.payment_collections).toEqual([cartPaymentCollection])
  })

  it("keeps the cart fields the client asked for", () => {
    const fields = withCartPaymentCollectionFields(["id", "cart.id"])
    const order = normalizeOrderPaymentCollections(buildOrder(), fields)

    expect(order.cart).toEqual({ id: "cart_1" })
    expect(order.payment_collections).toEqual([cartPaymentCollection])
  })

  it("never returns the shared payment collection under the cart", () => {
    const order = normalizeOrderPaymentCollections(buildOrder(), [
      "cart.id",
      "cart.payment_collection.id",
    ])

    expect(order.cart).toEqual({ id: "cart_1" })
  })
})
