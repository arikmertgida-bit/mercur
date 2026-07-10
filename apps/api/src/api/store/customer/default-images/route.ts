import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// The `minio-init` Docker Compose service seeds these two files into the
// MinIO bucket at startup (see docker-compose.yml, service `minio-init`,
// which copies storefront/public/images/customer-default-{avatar,banner}
// into `<bucket>/customer-defaults/{avatar,banner}`) — these fallbacks must
// match that seeded location, not the Medusa local file provider's URL
// scheme (a prior version of this file pointed at `/static/...`, which
// only resolves for files actually uploaded through Medusa's own file
// provider, not the separately-seeded MinIO defaults).
const DEFAULT_AVATAR_URL =
  process.env.STORE_DEFAULT_CUSTOMER_AVATAR_URL ??
  "http://localhost:9002/medusa-media/customer-defaults/avatar.jpg"
const DEFAULT_BANNER_URL =
  process.env.STORE_DEFAULT_CUSTOMER_BANNER_URL ??
  "http://localhost:9002/medusa-media/customer-defaults/banner.jpeg"

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  res.json({
    avatarUrl: DEFAULT_AVATAR_URL,
    bannerUrl: DEFAULT_BANNER_URL,
  })
}
