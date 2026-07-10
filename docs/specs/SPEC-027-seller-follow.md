---
status: passing
canonical: true
priority: 3
area: store/sellers
created: 2026-07-10
last_updated: 2026-07-10
---

# SPEC-027 Seller Follow (Store)

`storefront/src/lib/data/seller.ts` (`followSeller`, `unfollowSeller`,
`getFollowStatus`, `getFollowedSellers`) and the "Followed Vendors" account
page called `GET/POST/DELETE /store/sellers/:handle/follow` and
`GET /store/sellers-following` against a backend that never implemented
them — confirmed no route anywhere in `apps/api` or `@mercurjs/core`, and no
registry block exists for it either (unlike wishlist).

The root `README.md` constitution names `SellerFollowerModuleService` as its
own illustrative example of the expected "local Medusa V2 module" pattern
(Madde II) — coincidentally exactly this feature. That naming is adopted here
rather than inventing a different one.

An existing bare `seller <-> customer` link
(`packages/core/src/links/seller-customer-link.ts`) was found and deliberately
**not** reused — it backs the vendor's private customer/CRM list, a different
relationship than a customer publicly opting to follow a seller. Reusing it
would have silently conflated the two.

## Design

- New module `seller-follow` (`apps/api/src/modules/seller-follow`): a
  minimal `SellerFollower` entity (just `id` + timestamps — a follow is a
  boolean fact, not data-bearing, unlike `review`).
- Two links, per the approved plan's naming:
  `links/customer-seller-follow.ts` (customer → many follows) and
  `links/seller-follow-link.ts` (seller → many followers). No DB-level
  uniqueness constraint on the (customer, seller) pair — enforced instead at
  the workflow layer via a find-or-create step (`findOrCreateFollowStep`),
  mirroring `SPEC-025`'s wishlist pattern.
- `followSellerWorkflow` / `unfollowSellerWorkflow` use
  `createRemoteLinkStep` / `dismissRemoteLinkStep` (automatic compensation),
  same as SPEC-025.
- Route param is `[handle]`, not `[id]` — the existing
  `store/sellers/[id]/route.ts` filters by literal `id`, but the storefront
  calls this endpoint with the seller's `handle`; confirmed by reading the
  storefront call sites before writing the route.

## User-Visible Behavior

- `GET /store/sellers/:handle/follow` → `{ following: boolean, followers_count: number }`.
- `POST` follows (idempotent — following twice does not create a duplicate
  row); `DELETE` unfollows (idempotent — unfollowing a non-follow is a no-op,
  not an error).
- `GET /store/sellers-following?limit=&offset=` → `{ sellers: [{id, name,
  handle, photo, followed_at, status, is_active}], count }` — `photo` maps
  from `seller.logo` (fallback `""` since `logo` is nullable in the DB but the
  storefront's Zod schema requires a string); `is_active` is derived
  (`status === SellerStatus.OPEN`) since `Seller` has no raw boolean field for
  it; `member_photo` is intentionally omitted (optional in the storefront
  schema — no backing field exists on `Member` to source it from, and
  fabricating one was out of scope).

## Verification

- `cd apps/api && bunx tsc --noEmit`: 0 errors (after fixing a `LinkDefinition[]`
  return-type annotation TypeScript needed on both workflows' `transform()`
  callbacks — heterogeneous link-object array literals infer a union that
  fails `LinkDefinition`'s index signature without it).
- `cd mercur && bun run build`: 14/14 tasks succeed.
- `bunx medusa db:migrate` against a disposable local Postgres: `seller_follower`
  table created; link-sync reports both
  `customer.customer <> seller_follow.seller_follower` and
  `seller.seller <> seller_follow.seller_follower` correctly.
- Live `medusa start`: server boots clean with all three new modules loaded
  together. `GET /store/sellers/nonexistent-handle/follow` and
  `GET /store/sellers-following` both return 401 (not 404) without a customer
  session, with a valid publishable key — confirms route registration,
  dynamic `[handle]` segment matching, and auth middleware ordering.

## Evidence

Full authenticated round trip executed live against the real Docker
`kayi_backend`, covering every state transition:

- `GET .../follow` before following → `{following:false, followers_count:0}`.
- `POST .../follow` → `{following:true, followers_count:1}`.
- `POST .../follow` again (same customer, same seller) →
  identical response, confirming `findOrCreateFollowStep` is genuinely
  idempotent (no duplicate `seller_follower` row created).
- `GET /store/sellers-following` → correctly hydrated
  `{id, name, handle, photo:"", followed_at, status:"open", is_active:true}`
  via the two-hop Remote Query traversal (`customer → seller_follower →
  seller`), confirming that pattern — carried over unverified-live from
  SPEC-025's structurally-identical wishlist query at the time this was
  first written — does work end to end.
- `DELETE .../follow` → `{following:false, followers_count:0}`.
- `GET .../follow` after unfollow → confirms the dismissed links and deleted
  row are not just absent from the response but genuinely gone (re-query
  finds nothing to resurrect).

## Notes

- `docs/PRODUCT.md` does not mention seller-follow at all as a shipped
  feature — this is genuinely new backend surface, not a gap-fill of a
  documented-but-unbuilt feature (unlike wishlist).
