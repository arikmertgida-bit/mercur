import {
  findNonReturnableItems,
  getReturnableQuantity,
} from "../returnable-quantity"

const detail = (
  delivered: number,
  requested: number,
  received: number,
  dismissed: number
) => ({
  delivered_quantity: delivered,
  return_requested_quantity: requested,
  return_received_quantity: received,
  return_dismissed_quantity: dismissed,
})

describe("getReturnableQuantity", () => {
  it("subtracts requested, received and dismissed returns from the delivered quantity", () => {
    expect(getReturnableQuantity(detail(3, 1, 1, 0))).toBe(1)
    expect(getReturnableQuantity(detail(2, 0, 0, 1))).toBe(1)
  })

  it("returns 0 once a delivered item has already been received back", () => {
    // Medusa's own RETURN_ITEM check only subtracts return_requested_quantity
    // from fulfilled_quantity, so it still reports 1 here — which let a
    // single delivered unit be returned twice and pushed the order total
    // below zero.
    expect(getReturnableQuantity(detail(1, 0, 1, 0))).toBe(0)
  })

  it("never goes below 0", () => {
    expect(getReturnableQuantity(detail(1, 0, 2, 0))).toBe(0)
  })
})

describe("findNonReturnableItems", () => {
  const items = [
    { id: "item_a", detail: detail(1, 0, 1, 0) },
    { id: "item_b", detail: detail(2, 0, 0, 0) },
  ]

  it("flags an item whose delivered units were all received back already", () => {
    expect(findNonReturnableItems(items, [{ id: "item_a", quantity: 1 }])).toEqual([
      "item_a",
    ])
  })

  it("accepts quantities within the returnable amount", () => {
    expect(findNonReturnableItems(items, [{ id: "item_b", quantity: 2 }])).toEqual([])
  })

  it("flags quantities above the returnable amount, zero or negative quantities and unknown items", () => {
    expect(
      findNonReturnableItems(items, [
        { id: "item_b", quantity: 3 },
        { id: "item_b", quantity: 0 },
        { id: "item_b", quantity: -1 },
        { id: "item_x", quantity: 1 },
      ])
    ).toEqual(["item_b", "item_b", "item_b", "item_x"])
  })

  it("adds up several requests for the same item before comparing", () => {
    expect(
      findNonReturnableItems(items, [
        { id: "item_b", quantity: 1 },
        { id: "item_b", quantity: 2 },
      ])
    ).toEqual(["item_b"])
  })
})
