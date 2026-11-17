import { isIP } from 'node:net'

import type { MedusaRequest } from '@medusajs/framework/http'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

// Docker-network peers: kayi_nginx_gateway and the storefront server.
const PRIVATE_PEER =
  /^(?:::ffff:)?(?:10\.|127\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)|^::1$|^f[cd][0-9a-f]{2}:/i

// Requests reach the backend through kayi_nginx_gateway (browser → /api/) or
// the storefront server (its server actions log customers in). Both are
// private peers and pass the visitor's address in X-Real-IP: nginx overwrites
// it with $remote_addr, the storefront forwards the value nginx gave it.
// X-Forwarded-For is not used — its first entry is whatever the client sent,
// so a forged header gave every request a fresh bucket. Without a trusted
// X-Real-IP the peer itself is the key; keying on the peer alone made every
// visitor behind nginx or the storefront share one bucket.
// ipKeyGenerator groups IPv6 addresses by /56 subnet (express-rate-limit's
// own default) — one client can otherwise rotate through its subnet to
// bypass the limit.
type ClientAddressSource = Pick<MedusaRequest, 'headers' | 'ip'> & {
  socket?: { remoteAddress?: string }
}

type ReporterSource = ClientAddressSource & {
  auth_context?: { actor_id?: string }
}

export function resolveReporterKey(req: ReporterSource): string {
  const customerId = req.auth_context?.actor_id
  return customerId ? `customer:${customerId}` : resolveClientIp(req)
}

export function resolveClientIp(req: ClientAddressSource): string {
  const peer = req.socket?.remoteAddress ?? req.ip ?? ''
  const realIp = req.headers['x-real-ip']

  if (PRIVATE_PEER.test(peer) && typeof realIp === 'string' && isIP(realIp.trim())) {
    return ipKeyGenerator(realIp.trim())
  }

  return peer ? ipKeyGenerator(peer) : 'unknown'
}

// In-memory store: correct for this deployment (a single backend
// container/process). If the backend is ever scaled to multiple replicas,
// swap this for a shared store (e.g. Redis-backed) so the limit is enforced
// across all of them instead of resetting per-instance.

// Login, registration, and password-reset attempts for every actor type
// (admin/vendor/customer) share the /auth/* prefix — none of it was
// throttled before this, allowing unlimited credential-stuffing / brute
// force against any account.
// Mobile carriers put many shoppers behind one address (CGNAT), so a
// successful login, session exchange or token refresh is not counted: the
// limit then only bites on failed passwords. Registration and password-reset
// requests count even when they succeed (account and e-mail flooding).
const UNCOUNTED_WHEN_SUCCESSFUL =
  /^\/auth\/(?:[a-z]+\/emailpass|session|token\/refresh)\/?$/

export function isUncountedAuthSuccess(url: string, statusCode: number): boolean {
  const path = url.split("?")[0] ?? ""
  return statusCode < 400 && UNCOUNTED_WHEN_SUCCESSFUL.test(path)
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientIp,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) =>
    isUncountedAuthSuccess(req.originalUrl, res.statusCode),
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

// Product and review-image reports. A review-image report hides the image
// until an admin reviews it, so one account must not be able to hide every
// image in a loop. Keyed per customer (the routes require a login).
export const reportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveReporterKey,
  message: {
    type: "not_allowed",
    message: "Too many reports, please try again later.",
  },
})
