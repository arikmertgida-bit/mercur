import type { HttpTypes } from "@medusajs/types"
import i18n from "i18next"
import { beforeAll, describe, expect, it } from "vitest"
import type { z } from "zod"

import { getProductCreateFormDefaults } from "../../pages/products/create/constants"
import { CreateCustomerGroupSchema } from "../../pages/customer-groups/customer-group-create/components/create-customer-group-form/schema"
import { RegisterSchema } from "../../pages/register/register-schema"
import ar from "../../i18n/translations/ar.json"
import en from "../../i18n/translations/en.json"
import translations from "../../i18n/translations"
import tr from "../../i18n/translations/tr.json"
import { getPromotionStatus } from "../promotions"
import { TransferOwnershipSchema } from "../schemas"
import { optionalInt } from "../validation"

// The schemas above are imported before i18next is initialised — the order a
// panel bundle can load them in. Their messages must still come out in the
// language that is active when validation runs.
const LANGUAGES = [
  ["tr", tr],
  ["en", en],
  ["ar", ar],
] as const

const messageAt = (
  result: z.ZodSafeParseResult<object>,
  path: string
): string | undefined =>
  result.error?.issues.find((issue) => issue.path.join(".") === path)?.message

beforeAll(async () => {
  await i18n.init({
    resources: translations,
    lng: "tr",
    fallbackLng: "en",
    fallbackNS: "translation",
    interpolation: { escapeValue: false },
  })
})

describe("validation messages follow the active language", () => {
  it.each(LANGUAGES)("register form in %s", async (lng, dict) => {
    await i18n.changeLanguage(lng)
    const result = RegisterSchema.safeParse({
      first_name: "",
      last_name: "",
      email: "no-at-sign",
      password: "short",
      agreement_accepted: false,
    })

    expect(messageAt(result, "first_name")).toBe(dict.register.validation.firstNameRequired)
    expect(messageAt(result, "email")).toBe(dict.register.validation.emailInvalid)
    expect(messageAt(result, "password")).toBe(dict.register.validation.passwordMinLength)
    expect(messageAt(result, "agreement_accepted")).toBe(dict.register.validation.agreementRequired)
  })

  it.each(LANGUAGES)("customer group and shared number rules in %s", async (lng, dict) => {
    await i18n.changeLanguage(lng)
    const group = CreateCustomerGroupSchema.safeParse({ name: "" })
    const integer = optionalInt.safeParse("1.5")

    expect(messageAt(group, "name")).toBe(dict.customerGroups.validation.nameRequired)
    expect(integer.error?.issues[0]?.message).toBe(dict.validation.mustBeInt)
  })

  it.each(LANGUAGES)("transfer ownership in %s", async (lng, dict) => {
    await i18n.changeLanguage(lng)
    const result = TransferOwnershipSchema.safeParse({
      current_owner_id: "mem_1",
      new_owner_id: "",
    })

    expect(messageAt(result, "new_owner_id")).toBe(dict.transferOwnership.validation.required)
  })

  it.each(LANGUAGES)("promotion status label and default variant title in %s", async (lng, dict) => {
    await i18n.changeLanguage(lng)
    const promotion: HttpTypes.AdminPromotion = {
      id: "promo_1",
      status: "active",
      created_at: "2026-11-17T00:00:00.000Z",
      updated_at: "2026-11-17T00:00:00.000Z",
      deleted_at: null,
    }
    const [, label] = getPromotionStatus(promotion)

    expect(label).toBe(dict.statuses.active)
    expect(getProductCreateFormDefaults().variants?.[0]?.title).toBe(
      dict.products.create.defaults.variantTitle
    )
  })
})
