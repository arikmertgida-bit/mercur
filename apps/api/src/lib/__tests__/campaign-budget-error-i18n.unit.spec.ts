import { MedusaError } from "@medusajs/framework/utils"

import { AUTOMATIC_PROMOTION_ATTRIBUTE_BUDGET_CODE } from "../campaign-budget-attribute"
import { translateAdminError } from "../admin-error-i18n/translate-error"
import {
  translateEnglishStoreError,
  translateStoreError,
} from "../store-error-i18n/translate-error"
import { translateVendorError } from "../vendor-error-i18n/translate-error"

const automaticError = (): MedusaError =>
  new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "Automatic promotions can't be added to a campaign with a per-customer budget. Use a promotion code instead.",
    AUTOMATIC_PROMOTION_ATTRIBUTE_BUDGET_CODE
  )

describe("per-customer campaign budget errors", () => {
  it("explains the automatic-promotion rule in the vendor and admin panels", () => {
    expect(translateVendorError(automaticError(), "tr").message).toBe(
      "Müşteri başına bütçeli kampanyaya otomatik promosyon eklenemez. Bunun yerine promosyon kodu kullanın."
    )
    expect(translateAdminError(automaticError(), "de").message).toContain("Budget pro Kunde")
  })

  it("asks a guest to log in when a code needs a customer", () => {
    const medusaError = new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Attribute value for "customer_id" is required by promotion campaing budget'
    )
    expect(translateStoreError(medusaError, "tr").message).toBe(
      "Bu kampanyadan yararlanmak için giriş yapın."
    )
    expect(translateStoreError(medusaError, "ar").message).toBe("سجّل الدخول للاستفادة من هذه الحملة.")
  })

  it("does not leak Medusa's internal sentence to English shoppers either", () => {
    const medusaError = new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Attribute value for "customer_id" is required by promotion campaing budget'
    )
    expect(translateEnglishStoreError(medusaError)).toEqual({
      code: "campaign_requires_login",
      type: MedusaError.Types.INVALID_DATA,
      message: "Log in to use this campaign.",
    })
    expect(
      translateEnglishStoreError(
        new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found")
      )
    ).toBeUndefined()
  })
})
