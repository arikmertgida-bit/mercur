import { afterAll, describe, expect, it } from "vitest"
import { z } from "zod"

import { i18n } from "../../components/utilities/i18n/i18n"
import { installKayiZodErrorMap } from "../zod-error-map"

installKayiZodErrorMap()

describe("Kayı Zod error map (Zod 4)", () => {
  afterAll(async () => {
    await i18n.changeLanguage("en")
  })

  it("does not throw on issue codes it leaves to Zod (union, custom)", () => {
    const schema = z.object({
      price: z.union([z.literal(""), z.number()]),
      sku: z.string().refine(() => false),
    })

    const result = schema.safeParse({ price: true, sku: "x" })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.code)).toEqual([
      "invalid_union",
      "custom",
    ])
  })

  it("replaces Zod's English defaults for the codes it knows", () => {
    const schema = z.object({
      title: z.string().min(2),
      email: z.email(),
      missing: z.string(),
    })

    const result = schema.safeParse({ title: "a", email: "nope" })
    const messages = result.error?.issues.map((issue) => issue.message)

    expect(messages).toEqual([
      "Must be at least 2.",
      "Enter a valid email address.",
      "This field is required.",
    ])
  })

  it("reads an empty required text or list field as required, not 'at least 1'", () => {
    const schema = z.object({ code: z.string().min(1), tags: z.array(z.string()).min(1), qty: z.number().min(1) })

    const messages = schema.safeParse({ code: "", tags: [], qty: 0 }).error?.issues.map((issue) => issue.message)

    expect(messages).toEqual(["This field is required.", "This field is required.", "Must be at least 1."])
  })

  it.each([
    ["pt-BR", "Este campo é obrigatório."],
    ["zh-CN", "此字段为必填项。"],
    ["zh-TW", "此欄位為必填項目。"],
    ["tr", "Bu alan zorunludur."],
  ])("uses the %s messages for a hyphenated or plain language code", async (code, required) => {
    await i18n.init({ lng: code, resources: {} })
    await i18n.changeLanguage(code)

    expect(z.string().safeParse(undefined).error?.issues[0]?.message).toBe(required)
  })
})
