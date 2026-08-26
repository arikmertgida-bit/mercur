/**
 * Env-gated exception that lets a single, ops-configured test account submit
 * reviews without a completed order (storefront mirrors this in
 * `storefront/src/lib/reviews/constants.ts` to decide when to show the
 * bypass UI at all). The backend check below is the actual security
 * boundary: every other request must still carry a valid, customer-owned
 * order_id, enforced in `workflows/review/steps/validate-review.ts`.
 */
export function resolveReviewBypassEmail(): string | null {
  const configured = process.env.DEV_REVIEW_BYPASS_EMAIL
  const trimmed = typeof configured === "string" ? configured.trim() : ""
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Defense in depth: `DEV_REVIEW_BYPASS_EMAIL` alone must never be enough to
 * let a live production deployment mint unpurchased reviews — a `.env`
 * carried over from staging/dev (a copy-paste an ops engineer could easily
 * make) would otherwise silently leave this open. Mirrors the same
 * `NODE_ENV === "production"` convention `lib/messenger.ts` already uses for
 * this codebase's other prod-vs-dev branch, and mirrors the storefront's own
 * environment gate in `lib/reviews/constants.ts::isReviewDevelopmentEnvironment`.
 */
function isReviewBypassEnvironment(): boolean {
  return process.env.NODE_ENV !== "production"
}

export function isReviewBypassEmail(email: string | null | undefined): boolean {
  if (!isReviewBypassEnvironment()) {
    return false
  }

  const bypassEmail = resolveReviewBypassEmail()
  if (!bypassEmail) {
    return false
  }

  if (typeof email !== "string" || email.trim().length === 0) {
    return false
  }

  return email.trim().toLowerCase() === bypassEmail.toLowerCase()
}
