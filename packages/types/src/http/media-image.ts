/**
 * A media image as the vendor collection/category routes serialize their
 * `media_images` link (gallery images have `type: null`).
 */
export type VendorMediaImage = {
  id: string
  url: string
  type: string | null
  is_thumbnail: boolean
  is_banner: boolean
  rank?: number
}
