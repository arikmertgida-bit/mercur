import { defineMercurPermissions } from "@mercurjs/core/permissions/registry"

/**
 * Vendor permissions for Kayı's own routes (reviews, messenger, followers,
 * dashboard). Imported by api/middlewares.ts so the keys join the catalog
 * before the first request resolves a member's rights.
 */
export const KAYI_VENDOR_PERMISSION = {
  REVIEWS: "reviews",
  MESSAGES: "messages",
  FOLLOWERS: "followers",
  DASHBOARD: "dashboard",
} as const

export const kayiVendorPermissions = defineMercurPermissions([
  { key: KAYI_VENDOR_PERMISSION.REVIEWS, group: "reviews", surface: ["vendor"], rights: ["view", "edit"] },
  { key: KAYI_VENDOR_PERMISSION.MESSAGES, group: "messages", surface: ["vendor"], rights: ["view", "edit"] },
  { key: KAYI_VENDOR_PERMISSION.FOLLOWERS, group: "followers", surface: ["vendor"], rights: ["view"] },
  { key: KAYI_VENDOR_PERMISSION.DASHBOARD, group: "dashboard", surface: ["vendor"], rights: ["view"] },
])
