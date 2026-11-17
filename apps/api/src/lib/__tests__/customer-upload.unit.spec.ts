import {
  customerUploadFilename,
  isCustomerUploadKey,
  isCustomerUploadUrl,
} from "../customer-upload"

const BASE = "http://localhost:9002/kayi-media"

describe("customer upload ownership", () => {
  const previous = process.env.MINIO_FILE_URL

  beforeAll(() => {
    process.env.MINIO_FILE_URL = `${BASE}/`
  })

  afterAll(() => {
    process.env.MINIO_FILE_URL = previous
  })

  it("tags the filename with the customer id", () => {
    expect(customerUploadFilename("cus_A", "photo.jpg")).toBe(
      "customer-cus_A--photo.jpg"
    )
  })

  it("accepts only keys carrying the customer's own marker", () => {
    expect(isCustomerUploadKey("customer-cus_A--photo-01ABC.jpg", "cus_A")).toBe(true)
    expect(isCustomerUploadKey("prefix/customer-cus_A--photo-01ABC.jpg", "cus_A")).toBe(true)
    expect(isCustomerUploadKey("customer-cus_A--photo-01ABC.jpg", "cus_B")).toBe(false)
    expect(isCustomerUploadKey("customer-cus_AB--photo-01ABC.jpg", "cus_A")).toBe(false)
    expect(isCustomerUploadKey("product-image-01ABC.jpg", "cus_A")).toBe(false)
    expect(isCustomerUploadKey("customer-cus_A--x/../logo.jpg", "cus_A")).toBe(false)
    expect(isCustomerUploadKey("1763400000000-customer-cus_A--photo.jpg", "cus_A")).toBe(true)
    expect(isCustomerUploadKey("customer-cus_A--customer-cus_B--x.jpg", "cus_B")).toBe(false)
    expect(isCustomerUploadKey("abc-customer-cus_A--photo.jpg", "cus_A")).toBe(false)
  })

  it("accepts only our storage URLs of the customer's own uploads", () => {
    const own = `${BASE}/${encodeURIComponent("customer-cus_A--yorum fotoğraf-01ABC.jpg")}`
    expect(isCustomerUploadUrl(own, "cus_A")).toBe(true)
    expect(isCustomerUploadUrl(own, "cus_B")).toBe(false)
    expect(isCustomerUploadUrl(`${BASE}/seller-logo-01ABC.png`, "cus_A")).toBe(false)
    expect(isCustomerUploadUrl("https://tracker.example/customer-cus_A--x.png", "cus_A")).toBe(false)
    expect(isCustomerUploadUrl(`${BASE}.evil.example/customer-cus_A--x.png`, "cus_A")).toBe(false)
    expect(isCustomerUploadUrl(`${own}?track=1`, "cus_A")).toBe(false)
    expect(isCustomerUploadUrl(`${BASE}/%E0%A4%A`, "cus_A")).toBe(false)
  })
})
