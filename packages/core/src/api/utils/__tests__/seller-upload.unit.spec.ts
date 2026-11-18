import {
  isSellerUploadKey,
  isSellerUploadUrl,
  sellerUploadFilename,
} from "../seller-upload"

const BASE = "http://localhost:9002/kayi-media"

describe("seller upload ownership", () => {
  const previous = process.env.MINIO_FILE_URL

  beforeAll(() => {
    process.env.MINIO_FILE_URL = `${BASE}/`
  })

  afterAll(() => {
    process.env.MINIO_FILE_URL = previous
  })

  it("tags the filename with the seller id", () => {
    expect(sellerUploadFilename("sel_A", "logo.png")).toBe(
      "seller-sel_A--logo.png"
    )
  })

  it("accepts only keys carrying the seller's own marker", () => {
    expect(isSellerUploadKey("seller-sel_A--logo-01ABC.png", "sel_A")).toBe(true)
    expect(isSellerUploadKey("1763400000000-seller-sel_A--logo.png", "sel_A")).toBe(true)
    expect(isSellerUploadKey("seller-sel_A--logo-01ABC.png", "sel_B")).toBe(false)
    expect(isSellerUploadKey("seller-sel_AB--logo-01ABC.png", "sel_A")).toBe(false)
    expect(isSellerUploadKey("abc-seller-sel_A--logo.png", "sel_A")).toBe(false)
    expect(isSellerUploadKey("customer-sel_A--logo.png", "sel_A")).toBe(false)
    expect(isSellerUploadKey("product-01ABC.png", "sel_A")).toBe(false)
  })

  it("accepts only our storage URLs of the seller's own uploads", () => {
    const own = `${BASE}/${encodeURIComponent("seller-sel_A--ürün görseli-01ABC.jpg")}`
    expect(isSellerUploadUrl(own, "sel_A")).toBe(true)
    expect(isSellerUploadUrl(own, "sel_B")).toBe(false)
    expect(isSellerUploadUrl(`${own}?x=1`, "sel_A")).toBe(false)
    expect(
      isSellerUploadUrl("https://tracker.example.org/seller-sel_A--x.png", "sel_A")
    ).toBe(false)
    expect(
      isSellerUploadUrl(`${BASE}.evil.example/seller-sel_A--x.png`, "sel_A")
    ).toBe(false)
    expect(isSellerUploadUrl(`${BASE}/%E0%A4%A`, "sel_A")).toBe(false)
  })
})
