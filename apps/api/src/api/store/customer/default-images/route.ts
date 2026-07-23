import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// The `minio-init` Docker Compose service seeds these two files into the
// MinIO bucket at startup (see docker-compose.yml, service `minio-init`,
// which copies storefront/public/images/customer-default-{avatar,banner}
// into `<bucket>/customer-defaults/{avatar,banner}`). The bucket's public
// base URL must come from the same `MINIO_FILE_URL` env var the file module
// itself uses (medusa-config.ts) — hardcoding a second, independent guess
// at the bucket name here previously let the two drift apart.
const DEFAULT_MINIO_FILE_URL = "http://localhost:9002/kayi-media"
const MINIO_FILE_URL = process.env.MINIO_FILE_URL ?? DEFAULT_MINIO_FILE_URL

const DEFAULT_AVATAR_URL =
  process.env.STORE_DEFAULT_CUSTOMER_AVATAR_URL ??
  `${MINIO_FILE_URL}/customer-defaults/avatar.jpg`
const DEFAULT_BANNER_URL =
  process.env.STORE_DEFAULT_CUSTOMER_BANNER_URL ??
  `${MINIO_FILE_URL}/customer-defaults/banner.jpeg`

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  res.json({
    avatarUrl: DEFAULT_AVATAR_URL,
    bannerUrl: DEFAULT_BANNER_URL,
  })
}
