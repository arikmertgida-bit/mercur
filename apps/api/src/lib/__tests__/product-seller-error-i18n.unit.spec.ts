import { MedusaError } from "@medusajs/framework/utils"
import {
  PRODUCT_MOVE_NAMES_SEPARATOR,
  PRODUCT_MOVE_RESERVED_STOCK_CODE,
  PRODUCT_MOVE_SELLER_PRICE_LISTS_CODE,
  PRODUCT_MOVE_SELLER_PROMOTIONS_CODE,
  PRODUCT_SELLER_REQUIRED_CODE,
  PRODUCT_SELLER_UNCHANGED_CODE,
  PRODUCT_SHIPPING_PROFILE_NOT_SELLER_CODE,
  PRODUCT_STOCK_LOCATION_NOT_SELLER_CODE,
  ORDER_VARIANT_NOT_SELLER_CODE,
  PRODUCT_INVENTORY_ITEM_NOT_SELLER_CODE,
} from "@mercurjs/core/api/utils/admin-error-codes"

import { SUPPORTED_ADMIN_LANGUAGES } from "../admin-error-i18n/languages"
import { ADMIN_ERROR_MESSAGES } from "../admin-error-i18n/messages"
import { translateAdminError } from "../admin-error-i18n/translate-error"

const CODES = [
  PRODUCT_SELLER_REQUIRED_CODE,
  PRODUCT_SELLER_UNCHANGED_CODE,
  PRODUCT_SHIPPING_PROFILE_NOT_SELLER_CODE,
  PRODUCT_STOCK_LOCATION_NOT_SELLER_CODE,
  ORDER_VARIANT_NOT_SELLER_CODE,
  PRODUCT_INVENTORY_ITEM_NOT_SELLER_CODE,
  PRODUCT_MOVE_RESERVED_STOCK_CODE,
  PRODUCT_MOVE_SELLER_PROMOTIONS_CODE,
  PRODUCT_MOVE_SELLER_PRICE_LISTS_CODE,
]

const errorWith = (code: string, message = "English"): MedusaError =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message, code)

describe("admin product seller errors", () => {
  it.each(SUPPORTED_ADMIN_LANGUAGES)(
    "has its own sentence for every code in %s",
    (language) => {
      const fallback = ADMIN_ERROR_MESSAGES[language].typeFallback.invalidData
      const sentences = CODES.map(
        (code) => translateAdminError(errorWith(code), language).message
      )
      for (const sentence of sentences) {
        expect(sentence).not.toEqual(fallback)
        expect(sentence.trim().length).toBeGreaterThan(0)
      }
      expect(new Set(sentences).size).toEqual(CODES.length)
    }
  )

  it("keeps the blocking promotion codes and price list titles", () => {
    const promotions = translateAdminError(
      errorWith(
        PRODUCT_MOVE_SELLER_PROMOTIONS_CODE,
        `The old seller's promotions still name the product${PRODUCT_MOVE_NAMES_SEPARATOR}YAZ20, KIS10`
      ),
      "tr"
    )
    expect(promotions).toEqual({
      code: PRODUCT_MOVE_SELLER_PROMOTIONS_CODE,
      type: MedusaError.Types.INVALID_DATA,
      message:
        "Önce ürünü mevcut mağazanın şu promosyonlarından çıkarın: YAZ20, KIS10",
    })

    const priceLists = translateAdminError(
      errorWith(
        PRODUCT_MOVE_SELLER_PRICE_LISTS_CODE,
        `The old seller's price lists still price the product${PRODUCT_MOVE_NAMES_SEPARATOR}Toptan`
      ),
      "ar"
    )
    expect(priceLists.message).toContain("Toptan")
    expect(priceLists.message).not.toContain("{names}")
  })
})
