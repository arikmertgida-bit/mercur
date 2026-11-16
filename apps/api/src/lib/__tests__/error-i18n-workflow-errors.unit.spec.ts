import { MedusaError } from "@medusajs/framework/utils"
import { CART_PRICES_CHANGED_ERROR_CODE } from "@mercurjs/types"

import { toHandledError } from "../errors"
import { translateStoreError } from "../store-error-i18n/translate-error"

// What `workflow.run()` re-throws for a failed step: the serialized error
// from the transaction store, not an `Error` instance.
const serializedInventoryError = {
  name: "Error",
  message: "Some variant does not have the required inventory",
  type: MedusaError.Types.NOT_ALLOWED,
  code: MedusaError.Codes.INSUFFICIENT_INVENTORY,
  __isMedusaError: true,
}

describe("toHandledError", () => {
  it("returns real Error instances unchanged", () => {
    const error = new Error("boom")
    expect(toHandledError(error)).toBe(error)
  })

  it("rebuilds a MedusaError from a serialized workflow error", () => {
    const handled = toHandledError(serializedInventoryError)
    expect(handled).toBeInstanceOf(Error)
    expect(handled && MedusaError.isMedusaError(handled)).toBe(true)
    expect(handled?.message).toBe(serializedInventoryError.message)
  })

  it("wraps a plain serialized error without the Medusa marker", () => {
    const handled = toHandledError({ message: "plain" })
    expect(handled).toBeInstanceOf(Error)
    expect(handled && MedusaError.isMedusaError(handled)).toBe(false)
  })

  it("returns null when there is no usable message", () => {
    expect(toHandledError(null)).toBeNull()
    expect(toHandledError(undefined)).toBeNull()
    expect(toHandledError("text")).toBeNull()
    expect(toHandledError({ code: "x" })).toBeNull()
  })
})

describe("translateStoreError with workflow errors", () => {
  it("translates insufficient inventory to the shopper language", () => {
    const handled = toHandledError(serializedInventoryError)
    if (!handled) {
      throw new Error("expected a handled error")
    }
    expect(translateStoreError(handled, "tr")).toEqual({
      code: MedusaError.Codes.INSUFFICIENT_INVENTORY,
      type: MedusaError.Types.NOT_ALLOWED,
      message: "Yeterli stok bulunmuyor.",
    })
  })
  it("translates a cart whose prices changed before completion", () => {
    const handled = toHandledError({
      name: "Error",
      message: "The prices in your cart have been updated. Please review your cart.",
      type: MedusaError.Types.NOT_ALLOWED,
      code: CART_PRICES_CHANGED_ERROR_CODE,
      __isMedusaError: true,
    })
    if (!handled) {
      throw new Error("expected a handled error")
    }
    expect(translateStoreError(handled, "tr")).toEqual({
      code: CART_PRICES_CHANGED_ERROR_CODE,
      type: MedusaError.Types.NOT_ALLOWED,
      message: "Sepetinizdeki fiyatlar güncellendi. Lütfen sepetinizi kontrol edin.",
    })
  })
})
