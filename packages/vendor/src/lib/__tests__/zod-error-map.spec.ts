import { describe, expect, it } from "vitest"
import { z } from "zod"

import { installKayiZodErrorMap } from "../zod-error-map"

installKayiZodErrorMap()

describe("Kayı Zod error map (Zod 4)", () => {
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
})
