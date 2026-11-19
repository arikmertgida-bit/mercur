import { describe, expect, test } from "vitest"
import type { PermissionRight } from "@mercurjs/dashboard-sdk"

import { formatNameList, formatRequiredPermissions } from "../permission-description"

const NAMES: Record<string, string> = {
  "stock_locations:view": "Stok: Görebilir",
  "products:edit": "Ürünler: Düzenleyebilir",
}
const describe_ = (key: string, right: PermissionRight): string | null => NAMES[`${key}:${right}`] ?? null

describe("formatRequiredPermissions", () => {
  test("names the permissions instead of printing the raw keys", () => {
    expect(formatRequiredPermissions(["stock_locations:view"], describe_, "tr", true)).toBe("Stok: Görebilir")
    expect(
      formatRequiredPermissions(["stock_locations:view", "products:edit"], describe_, "en", true)
    ).toBe("Stok: Görebilir and Ürünler: Düzenleyebilir")
    expect(
      formatRequiredPermissions(["stock_locations:view", "products:edit"], describe_, "en", false)
    ).toBe("Stok: Görebilir or Ürünler: Düzenleyebilir")
  })

  test("names nothing when one permission has no name, so no raw key is shown", () => {
    expect(formatRequiredPermissions(["stock_locations:view", "members:view"], describe_, "tr", true)).toBeNull()
    expect(formatRequiredPermissions([], describe_, "tr", true)).toBeNull()
  })

  test("a name shared by several keys is listed once", () => {
    const sameArea = (): string => "Stok: Görebilir"
    expect(formatRequiredPermissions(["stock_locations:view", "inventory_items:view"], sameArea, "tr", true)).toBe(
      "Stok: Görebilir"
    )
  })
})

describe("formatNameList", () => {
  test("uses the reader's list punctuation", () => {
    expect(formatNameList(["أ", "ب", "ج"], "ar", "conjunction")).toBe("أ وب وج")
    expect(formatNameList(["A", "B"], "tr", "conjunction")).toBe("A ve B")
  })

  test("accepts the panels' region-suffixed codes", () => {
    expect(formatNameList(["A", "B"], "ptBR", "conjunction")).toBe("A e B")
    expect(formatNameList(["A", "B"], "zhCN", "conjunction")).toBe("A和B")
  })

  test("falls back to English for an unknown code", () => {
    expect(formatNameList(["A", "B"], "not a language", "conjunction")).toBe("A and B")
  })
})
