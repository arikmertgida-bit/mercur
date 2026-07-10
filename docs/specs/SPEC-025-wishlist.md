---
status: passing
canonical: true
priority: 3
area: store/wishlist
created: 2026-07-10
last_updated: 2026-07-10
---

# SPEC-025 Wishlist (Store)

Closes the gap where `b2c-storefront`'s wishlist UI (`src/lib/data/wishlist.ts`,
`user/wishlist` page, `WishlistProvider`) called `/store/wishlist` and
`/store/wishlist/product/:id` against a backend that never implemented them —
confirmed 404 in production before this spec.

The official `@mercurjs/registry` ships a complete `wishlist` block
(`packages/registry/src/wishlist`) with the exact routes the storefront
expects. This spec installs it locally into `apps/api`, with two deliberate
deviations from the upstream block:

1. `modules/wishlist/utils.ts`'s `getWishlistFromCustomerId` is reimplemented
   over Remote Query (`customer-wishlist` link entrypoint) instead of the
   upstream's raw `knex`/`__pg_connection__` lookup — raw SQL is banned by the
   root `README.md` constitution (Madde II).
2. The `create-wishlist` / `delete-wishlist` workflow steps use
   `createRemoteLinkStep` / `dismissRemoteLinkStep` from
   `@medusajs/medusa/core-flows` instead of hand-rolled `link.create()` /
   `link.dismiss()` calls with no compensation — the constitution requires
   every mutative workflow step to have a compensate function (Madde V); the
   framework steps provide this for free.

No admin moderation routes exist in the upstream registry block (confirmed via
repeated `Glob`/`Grep` — only `api/store/**`), despite `docs/PRODUCT.md`
mentioning "admin moderation routes" for wishlist. That claim does not match
the actual registry source; no admin surface was fabricated to satisfy it.

## User-Visible Behavior

- A logged-in customer can add a product to their wishlist
  (`POST /store/wishlist`), see it (`GET /store/wishlist`), and remove it
  (`DELETE /store/wishlist/product/:reference_id`).
- The first add for a customer creates their one wishlist row; subsequent
  adds reuse it (verified: two adds from the same customer return the same
  `wishlist.id`).
- Unauthenticated requests are rejected (401 with a valid publishable key, 400
  without one — standard Medusa store middleware order).

## Backend

- `apps/api/src/modules/wishlist/**` — module, model (`wishlist`, `reference`
  enum `["product"]`), service, Remote-Query utils, migration
  `Migration20260710060000`.
- `apps/api/src/links/customer-wishlist.ts`, `wishlist-product.ts`.
- `apps/api/src/workflows/wishlist/**` — `createWishlistEntryWorkflow`,
  `deleteWishlistEntryWorkflow`.
- `apps/api/src/api/store/wishlist/**` — `route.ts` (GET/POST),
  `product/[reference_id]/route.ts` (DELETE), `middlewares.ts`,
  `query-config.ts`, `validators.ts`.
- Registered in `medusa-config.ts` and `api/middlewares.ts`.

## Verification

- `cd apps/api && bunx tsc --noEmit`: 0 errors.
- `cd mercur && bun run build`: 14/14 tasks succeed.
- `bunx medusa db:migrate` against a disposable local Postgres: `wishlist`
  table created; link-sync reports both
  `customer.customer <> wishlist.wishlist` and
  `wishlist.wishlist <> product.product` correctly.
- Live `medusa start` on an alternate port against the same disposable DB:
  server boots clean; `GET /store/wishlist` returns 400 (publishable key
  required, not 404) unauthenticated, and 401 (not 404) with a valid
  publishable key but no customer session — confirms real route registration
  and middleware ordering.
- `mercur/integration-tests/http/wishlist/store/wishlist.spec.ts` was written
  (5 cases: create+list, wishlist reuse across two products, delete, 404 on
  delete-with-no-wishlist, 401 unauthenticated) but **cannot currently run** —
  `integration-tests/medusa-config.ts` only boots `@mercurjs/core`, not
  `apps/api`-local modules; pointing its module `resolve` at either raw TS or
  the compiled `.medusa/server` output both failed at the config-loader's
  `require()` step. This is a pre-existing gap: `reviews` (already shipped)
  has the same problem and zero integration test coverage today. Not fixed as
  part of this spec — flagged for a follow-up on the test harness itself.

## Evidence

Full authenticated round trip executed live against the real Docker
`kayi_backend` (rebuilt + redeployed, real Postgres, real customer/seller/
product seeded via `medusa exec` inside the container):

- `POST /store/wishlist {reference:"product", reference_id}` → `201`, real
  `wishlist` row created.
- `GET /store/wishlist` (with a production-configured publishable key that
  has a sales channel — required by the inherited
  `filterByValidSalesChannels()` middleware, same as core `/store/products`)
  → `200`, correctly hydrated product object via the 2-hop
  `wishlist.products.id` Remote Query traversal.
- `DELETE /store/wishlist/product/:id` → `200`, `deleted:true`.

The earlier `scrypt-kdf` blocker was resolved by running the seed script
inside the container (`docker exec`, from `apps/api`'s own source directory
so its local `node_modules` resolves) instead of via an ad-hoc host script,
and by minting the JWT directly rather than exercising the password-login
path (which is what `integration-tests/helpers/create-customer-user.ts` does
too).

## Notes

- `storefront/src/lib/data/wishlist.ts`'s `removeWishlistItem` has a comment
  pinning `DELETE` semantics to "b2c-core v1.5.3" — reverified against this
  implementation and still accurate (`wishlist_id` accepted but resolved
  server-side from the authenticated customer via `getWishlistFromCustomerId`).
