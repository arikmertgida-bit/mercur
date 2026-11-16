import {
  grantLinkFields,
  STORE_ORDER_LIST_LINK_FIELDS,
  STORE_ORDER_RETRIEVE_LINK_FIELDS,
} from "../middlewares"

const RETURN_FIELDS = [
  "returns.id",
  "returns.status",
  "returns.created_at",
  "returns.requested_at",
  "returns.received_at",
  "returns.canceled_at",
  "returns.items",
]

describe("store orders link fields", () => {
  it("adds the link fields to what is already allowed, once", () => {
    const allowed = ["customer.id", "seller.id"]

    grantLinkFields(allowed, STORE_ORDER_LIST_LINK_FIELDS)

    expect(allowed[0]).toBe("customer.id")
    expect(allowed.filter((field) => field === "seller.id")).toHaveLength(1)
    expect(allowed).toEqual(expect.arrayContaining(STORE_ORDER_LIST_LINK_FIELDS))
  })

  it("lets the review list see seller name and review summary", () => {
    expect(STORE_ORDER_LIST_LINK_FIELDS).toEqual(
      expect.arrayContaining(["seller.name", "reviews.id", "reviews.rating"])
    )
  })

  it("lets the return page see the seller return address and order group", () => {
    expect(STORE_ORDER_RETRIEVE_LINK_FIELDS).toEqual(
      expect.arrayContaining(["seller.address.address_1", "order_group.id"])
    )
  })

  it("lets the returns list and return detail link to the seller page", () => {
    for (const fields of [STORE_ORDER_LIST_LINK_FIELDS, STORE_ORDER_RETRIEVE_LINK_FIELDS]) {
      expect(fields).toEqual(expect.arrayContaining(["seller.handle", "seller.logo"]))
    }
  })

  it("lets the returns pages read the shopper's own returns", () => {
    for (const fields of [STORE_ORDER_LIST_LINK_FIELDS, STORE_ORDER_RETRIEVE_LINK_FIELDS]) {
      expect(fields).toEqual(expect.arrayContaining(RETURN_FIELDS))
    }
  })

  it("never grants a whole seller relation", () => {
    const all = [...STORE_ORDER_LIST_LINK_FIELDS, ...STORE_ORDER_RETRIEVE_LINK_FIELDS]

    expect(all).not.toContain("seller")
    expect(all.filter((field) => field.startsWith("seller.members"))).toHaveLength(0)
    expect(all).not.toContain("seller.phone")
  })
})
