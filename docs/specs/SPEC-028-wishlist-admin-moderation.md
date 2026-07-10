---
status: passing
canonical: true
priority: 3
area: admin/wishlist
created: 2026-07-10
last_updated: 2026-07-10
---

# SPEC-028 Wishlist Admin Moderation

`docs/PRODUCT.md` claimed wishlist ships with "admin moderation routes," but
the official `@mercurjs/registry` wishlist block (installed in SPEC-025)
ships none — confirmed via repeated `Glob`/`Grep`, only `api/store/**`. This
spec builds that surface as new scope (user-approved, not upstream-sourced):
a platform-wide admin view of all customer wishlists, with the ability to
remove a wishlist as a moderation action.

## User-Visible Behavior

- An authenticated admin user can `GET /admin/wishlist` to list every
  wishlist on the platform (paginated), each row showing the owning
  customer and the linked products.
- `DELETE /admin/wishlist/:id` removes a wishlist entirely (soft delete) —
  idempotent-safe: deleting an already-deleted wishlist returns 404, not a
  crash.
- Admin panel page at `/wishlist-moderation` (sidebar label "Wishlists")
  lists all wishlists in a table with a delete action gated by a
  danger-variant confirmation prompt.
- Both routes require real admin authentication (global `/admin/*` auth);
  unauthenticated requests get 401.

## Backend

- `apps/api/src/api/admin/wishlist/route.ts` — `GET`, direct
  `query.graph({entity:"wishlist", fields:[...,"customer.*","products.*"]})`
  traversal (simpler than the store route's two-hop
  `customerWishlist.entryPoint` pattern, since admin needs to enumerate
  across all customers).
- `apps/api/src/api/admin/wishlist/[id]/route.ts` — `DELETE`, existence
  check via `WishlistModuleService.listWishlists({id})` (404 if absent),
  then runs `adminDeleteWishlistWorkflow`.
- `apps/api/src/api/admin/wishlist/{middlewares,query-config,validators}.ts`
  — mirrors the existing `admin/product-reports` four-file shape.
- `apps/api/src/workflows/wishlist/workflows/admin-delete-wishlist.ts` —
  new workflow: `useQueryGraphStep` fetches the wishlist's `customer.id` and
  `products.id`, `transform` builds a dismiss-link array (one
  `customer-wishlist` entry + one `wishlist-product` entry per linked
  product — `wishlist-product` has `deleteCascade: false`, so each must be
  explicitly dismissed), `dismissRemoteLinkStep` removes them (built-in
  compensate), then `deleteWishlistRecordStep` soft-deletes the wishlist row.
- `apps/api/src/workflows/wishlist/steps/delete-wishlist-record.ts` — new
  step: `service.softDeleteWishlists(id)`, compensate
  `service.restoreWishlists(id)`.
- Registered in `apps/api/src/api/middlewares.ts`.

## Admin UI

- `apps/admin-test/src/routes/wishlist-moderation/page.tsx` — mirrors
  `product-reports/page.tsx`'s pattern exactly: `@medusajs/ui` table,
  `ActionMenu`/`NoRecords` from `@mercurjs/dashboard-shared`, `usePrompt()`
  danger-variant confirm before delete, `client.admin.wishlist.query(...)` /
  `client.admin.wishlist.$id.delete(...)` via the auto-generated typed
  client (no manual hook file, per this repo's admin-test convention).
  `rank: 87` (slotted below `reported-images` at 88).
- `apps/admin-test/src/i18n/en.json` — new `wishlistModeration` key block.

## Verification

- `cd apps/api && bunx tsc --noEmit`: 0 errors.
- `cd mercur && bun run build`: 14/14 tasks succeed.
- Constitution linter (`scripts/check-constitution.mjs`): 0 new violations.

## Evidence

Full authenticated round trip executed live against the real Docker
`kayi_backend` + `kayi_admin` (rebuilt + redeployed):

- `GET /admin/wishlist` (real admin JWT) → `200`, correctly hydrated a
  leftover wishlist entry from Session 41's E2E verification (customer +
  product names resolved).
- `DELETE /admin/wishlist/:id` on that same row → `200`,
  `{success:true, deleted:true}`.
- `GET /admin/wishlist` again → `200`, empty list — confirms the delete
  removed it from listing.
- `DELETE /admin/wishlist/:id` again on the same id → `404`, "Wishlist with
  id ... was not found" — confirms idempotent-safe repeat-delete handling.
- `GET /admin/wishlist` without an `Authorization` header → `401`.
- Admin panel bundle (`http://localhost:7000/`) inspected directly:
  `wishlistModeration` i18n string confirmed present in the built JS,
  confirming the page shipped in the deployed image. Full browser-rendered
  verification was not performed (no browser automation tool available this
  session) — route-level and bundle-inclusion checks are the verification
  tier achieved.

## Notes

- This closes the SPEC-025 gap flagged in its own Notes section
  ("no admin moderation routes exist in the upstream registry block"). The
  claim in `docs/PRODUCT.md` is therefore now accurate and needs no further
  correction.
