import { describe, expect, it } from "vitest"

import { collectFormErrors } from "./form-error-list"

describe("collectFormErrors", () => {
  it("flattens nested field, row and array-root errors", () => {
    const errors = {
      title: { type: "too_small", message: "Title is required" },
      shipping_profile_id: { type: "too_small", message: "Pick a profile" },
      variants: Object.assign(
        [
          {
            prices: { type: "custom", message: "Enter a price" },
            inventory: { type: "custom", message: "Enter stock" },
          },
        ],
        { root: { type: "custom", message: "Select a variant" } }
      ),
    }

    expect(collectFormErrors(errors)).toEqual([
      { path: ["title"], message: "Title is required" },
      { path: ["shipping_profile_id"], message: "Pick a profile" },
      { path: ["variants", "0", "prices"], message: "Enter a price" },
      { path: ["variants", "0", "inventory"], message: "Enter stock" },
      { path: ["variants"], message: "Select a variant" },
    ])
  })

  it("skips errors without a message", () => {
    expect(collectFormErrors({ title: { type: "custom" } })).toEqual([])
  })
})
