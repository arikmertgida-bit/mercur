import { MedusaError } from "@medusajs/framework/utils"
import {
  MEMBER_INVITE_EMAIL_MISMATCH_CODE,
  SELLER_IMAGE_NOT_OWNED_CODE,
} from "@mercurjs/core/api/utils/vendor-error-codes"

import { SUPPORTED_VENDOR_LANGUAGES } from "../vendor-error-i18n/languages"
import { translateVendorError } from "../vendor-error-i18n/translate-error"

const errorWith = (code: string, type: string): MedusaError =>
  new MedusaError(type, "English source message", code)

describe("vendor ownership errors", () => {
  it.each([
    [SELLER_IMAGE_NOT_OWNED_CODE, MedusaError.Types.INVALID_DATA],
    [MEMBER_INVITE_EMAIL_MISMATCH_CODE, MedusaError.Types.NOT_ALLOWED],
  ])("translates %s in every panel language", (code, type) => {
    const messages = new Set<string>()
    for (const language of SUPPORTED_VENDOR_LANGUAGES) {
      const translated = translateVendorError(errorWith(code, type), language)
      expect(translated.code).toBe(code)
      expect(translated.message).not.toBe("English source message")
      expect(translated.message.length).toBeGreaterThan(10)
      messages.add(translated.message)
    }
    expect(messages.size).toBe(SUPPORTED_VENDOR_LANGUAGES.length)
  })

  it("uses the Turkish wording", () => {
    expect(
      translateVendorError(
        errorWith(SELLER_IMAGE_NOT_OWNED_CODE, MedusaError.Types.INVALID_DATA),
        "tr"
      ).message
    ).toBe("Görseller mağazanızın yüklediği dosyalardan olmalıdır.")
  })
})
