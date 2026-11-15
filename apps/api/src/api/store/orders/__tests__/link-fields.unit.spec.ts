import {
  grantLinkFields,
  STORE_ORDER_LIST_LINK_FIELDS,
  STORE_ORDER_RETRIEVE_LINK_FIELDS,
} from "../middlewares"

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

  it("never grants a whole seller relation", () => {
    const all = [...STORE_ORDER_LIST_LINK_FIELDS, ...STORE_ORDER_RETRIEVE_LINK_FIELDS]

    expect(all).not.toContain("seller")
    expect(all.filter((field) => field.startsWith("seller.members"))).toHaveLength(0)
    expect(all).not.toContain("seller.phone")
  })
})
