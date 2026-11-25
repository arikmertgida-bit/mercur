import { describe, expect, it } from "vitest"

import { hasNotificationUrl, splitNotificationContent } from "../notification-segments"

describe("splitNotificationContent", () => {
  it("keeps a message without links as one piece", () => {
    expect(splitNotificationContent("Kampanya başladı")).toEqual([
      { key: 0, text: "Kampanya başladı", url: null },
    ])
    expect(hasNotificationUrl("Kampanya başladı")).toBe(false)
  })

  it("puts each link after the text before it and keeps the rest", () => {
    const content = "Yeni indirim https://kayi.com/a ve https://kayi.com/b bitti"
    expect(hasNotificationUrl(content)).toBe(true)
    expect(splitNotificationContent(content)).toEqual([
      { key: 0, text: "Yeni indirim ", url: "https://kayi.com/a" },
      { key: 31, text: " ve ", url: "https://kayi.com/b" },
      { key: 53, text: " bitti", url: null },
    ])
  })

  it("gives every piece a different key, also for repeated text", () => {
    const content = "x https://a.b x https://a.b x"
    const keys = splitNotificationContent(content).map((segment) => segment.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("ends on the link when nothing follows it", () => {
    expect(splitNotificationContent("https://kayi.com")).toEqual([
      { key: 0, text: "", url: "https://kayi.com" },
    ])
  })
})
