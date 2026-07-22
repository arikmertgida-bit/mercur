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

export function isReviewBypassEmail(email: string | null | undefined): boolean {
  const bypassEmail = resolveReviewBypassEmail()
  if (!bypassEmail) {
    return false
  }

  if (typeof email !== "string" || email.trim().length === 0) {
    return false
  }

  return email.trim().toLowerCase() === bypassEmail.toLowerCase()
}
