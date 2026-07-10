---
status: passing
canonical: true
priority: 3
area: store/customer
created: 2026-07-10
last_updated: 2026-07-10
---

# SPEC-026 Customer Avatar / Cover Upload (Store)

`storefront/src/lib/data/customer.ts` (`uploadCustomerFile`,
`deleteCustomerPhoto`, `getDefaultImages`) and the production-grade
`CustomerProfileHeader` UI already fully implemented client-side avatar/cover
upload, with validation (file type, size, min dimensions) — but called
`POST/DELETE /store/customer/upload` and `GET /store/customer/default-images`,
neither of which existed anywhere in the backend. Confirmed 404.

No new module is introduced: this is presentation data on the existing
`customer` entity (stored in `customer.metadata` under
`METADATA_KEYS.AVATAR_URL` / `AVATAR_FILE_ID` / `COVER_URL` / `COVER_FILE_ID`,
already defined storefront-side), plus two thin routes reusing Medusa core's
own `uploadFilesWorkflow` / `deleteFilesWorkflow` (`@medusajs/core-flows`) —
the same mechanism `@mercurjs/core`'s `POST /vendor/uploads` already uses.

## User-Visible Behavior

- A logged-in customer can upload an avatar or cover photo from their
  settings/profile page; the file is stored via the configured Medusa file
  provider and the resulting URL persisted to their own metadata by the
  storefront (unchanged, already-shipped logic).
- Deleting a photo removes the stored file and clears the metadata key.
- `GET /store/customer/default-images` returns placeholder avatar/banner URLs
  (env-configurable via `STORE_DEFAULT_CUSTOMER_AVATAR_URL` /
  `STORE_DEFAULT_CUSTOMER_BANNER_URL`, with local-dev fallbacks) for customers
  who haven't uploaded anything — this is a soft/cosmetic contract: the
  storefront already treats a missing/invalid response as non-fatal and falls
  back to its own bundled local images.

## Backend

- `apps/api/src/api/store/customer/upload/route.ts` — `POST` (multipart,
  `multer.memoryStorage()`, field name `files` matching the storefront's
  `FormData.append("files", file)`) runs `uploadFilesWorkflow`; `DELETE`
  (JSON body `{ fileId }`) runs `deleteFilesWorkflow`.
- `apps/api/src/api/store/customer/upload/middlewares.ts` — `authenticate("customer", ...)`
  on both methods; multer only on `POST` (the `DELETE` body is JSON, not
  multipart).
- `apps/api/src/api/store/customer/default-images/route.ts` — public `GET`,
  no auth (matches the storefront caller, which sends no auth headers).

## Verification

- `cd apps/api && bunx tsc --noEmit`: 0 errors.
- `cd mercur && bun run build`: 14/14 tasks succeed (this surfaced and fixed a
  real `noUnusedParameters` violation on the `default-images` handler's `req`
  — caught by `apps/vendor`'s `tsc -b` project-reference build, not by
  `apps/api`'s own standalone `tsc --noEmit`).
- Live `medusa start` on an alternate port: `GET /store/customer/default-images`
  with a valid publishable key returns `200` with the exact
  `{avatarUrl, bannerUrl}` shape the storefront's `DefaultImagesSchema`
  expects. `POST /store/customer/upload` returns 401 (not 404) without a
  customer session, confirming route + auth registration.

## Evidence

Full authenticated round trip executed live against the real Docker
`kayi_backend`:

- `GET /store/customer/default-images` → `200`,
  `{avatarUrl, bannerUrl}` matching the storefront's `DefaultImagesSchema`.
- `POST /store/customer/upload` (real multipart PNG, `x-image-type: avatar`)
  → `200`, `{"files":[{"id": "...", "url": "http://localhost:9000/static/..."}]}`
  — exact shape the storefront's `UploadResponseSchema` expects.
- `DELETE /store/customer/upload {"fileId": "<id-from-upload>"}` → `200`,
  `{id, object:"file", deleted:true}`.

## Notes

- No new module/link/migration — nothing to register in `medusa-config.ts`
  beyond what SPEC-025/SPEC-027 already added elsewhere.
