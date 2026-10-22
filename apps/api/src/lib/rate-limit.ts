import type { MedusaRequest } from '@medusajs/framework/http'
import rateLimit from 'express-rate-limit'

// Requests normally arrive via kayi_nginx_gateway, which sets X-Forwarded-For
// to the real client IP (see nginx/nginx.conf). Express's own req.ip would
// otherwise resolve to the gateway container's IP for every request,
// collapsing every real client into a single shared rate-limit bucket.
function resolveClientIp(req: MedusaRequest): string {
  const forwardedFor = req.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0]!.trim()
  }
  return req.ip ?? 'unknown'
}

// In-memory store: correct for this deployment (a single backend
// container/process). If the backend is ever scaled to multiple replicas,
// swap this for a shared store (e.g. Redis-backed) so the limit is enforced
// across all of them instead of resetting per-instance.

// Login, registration, and password-reset attempts for every actor type
// (admin/vendor/customer) share the /auth/* prefix — none of it was
// throttled before this, allowing unlimited credential-stuffing / brute
// force against any account.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientIp,
  message: {
    type: 'not_allowed',
    message: 'Too many attempts, please try again later.',
  },
})

// Seller registration (POST /vendor/sellers) sits outside /auth/* and was
// equally unthrottled — a bot could mass-create pending seller accounts.
export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientIp,
  message: {
    type: 'not_allowed',
    message: 'Too many attempts, please try again later.',
  },
})
