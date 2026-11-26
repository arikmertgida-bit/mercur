import { describe, expect, it } from "vitest"

import { withContentKeys } from "./content-keys"

describe("withContentKeys", () => {
  it("keys items by content", () => {
    expect(
      withContentKeys(["a", "b"], (item) => item).map(({ key }) => key)
    ).toEqual(["a", "b"])
  })

  it("keeps repeated content unique", () => {
    expect(
      withContentKeys(["a", "b", "a", "a"], (item) => item).map(
        ({ key }) => key
      )
    ).toEqual(["a", "b", "a#1", "a#2"])
  })

  it("keeps a key with its item when an earlier item is removed", () => {
    const before = withContentKeys(["x", "y", "z"], (item) => item)
    const after = withContentKeys(["y", "z"], (item) => item)

    expect(after.find(({ item }) => item === "z")?.key).toBe(
      before.find(({ item }) => item === "z")?.key
    )
  })
})
