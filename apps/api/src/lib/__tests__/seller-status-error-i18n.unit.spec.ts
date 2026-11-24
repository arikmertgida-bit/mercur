import { MedusaError } from "@medusajs/framework/utils"
import {
  SELLER_PENDING_APPROVAL_CODE,
  SELLER_SUSPENDED_CODE,
  SELLER_TERMINATED_CODE,
} from "@mercurjs/core/api/utils/vendor-error-codes"

import { SUPPORTED_VENDOR_LANGUAGES } from "../vendor-error-i18n/languages"
import { translateVendorError } from "../vendor-error-i18n/translate-error"

const STATUS_CODES = [
  SELLER_PENDING_APPROVAL_CODE,
  SELLER_SUSPENDED_CODE,
  SELLER_TERMINATED_CODE,
]

const errorWith = (code: string): MedusaError =>
  new MedusaError(MedusaError.Types.NOT_ALLOWED, "English source message", code)

describe("seller status errors", () => {
  it.each(STATUS_CODES)("translates %s in every panel language", (code) => {
    const messages = new Set<string>()
    for (const language of SUPPORTED_VENDOR_LANGUAGES) {
      const translated = translateVendorError(errorWith(code), language)
      expect(translated.code).toBe(code)
      expect(translated.type).toBe(MedusaError.Types.NOT_ALLOWED)
      expect(translated.message).not.toBe("English source message")
      expect(translated.message.length).toBeGreaterThan(10)
      messages.add(translated.message)
    }
    expect(messages.size).toBe(SUPPORTED_VENDOR_LANGUAGES.length)
  })

  it("gives each status its own message in every language", () => {
    for (const language of SUPPORTED_VENDOR_LANGUAGES) {
      const messages = new Set(
        STATUS_CODES.map(
          (code) => translateVendorError(errorWith(code), language).message
        )
      )
      expect(messages.size).toBe(STATUS_CODES.length)
    }
  })

  it("uses the Turkish wording", () => {
    expect(
      translateVendorError(errorWith(SELLER_PENDING_APPROVAL_CODE), "tr").message
    ).toBe(
      "Mağazanız yönetici onayı bekliyor; onaylanana kadar bu işlemi yapamazsınız."
    )
    expect(
      translateVendorError(errorWith(SELLER_TERMINATED_CODE), "tr").message
    ).toBe(
      "Mağazanız platform yöneticisi tarafından kalıcı olarak sonlandırıldı; bu işlemi yapamazsınız."
    )
  })
})
