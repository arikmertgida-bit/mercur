/**
 * Files a customer uploads get their customer id baked into the storage key
 * (the provider builds the key from the filename), so ownership can be
 * checked later without a table: a customer may only delete or reference
 * keys that carry their own marker.
 */
const CUSTOMER_UPLOAD_MARKER = "customer-"
const CUSTOMER_UPLOAD_SEPARATOR = "--"

export const customerUploadFilename = (
  customerId: string,
  filename: string
): string =>
  `${CUSTOMER_UPLOAD_MARKER}${customerId}${CUSTOMER_UPLOAD_SEPARATOR}${filename}`

const lastKeySegment = (key: string): string => {
  const parts = key.split("/")
  return parts[parts.length - 1] ?? ""
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Our MinIO provider keys a file as `<name>-<ulid><ext>`; Medusa's local
// provider (used by the test app) as `<timestamp>-<name><ext>`. The marker
// must sit at the start of the name either way, never further in, so a
// customer cannot forge another customer's marker through the filename.
export const isCustomerUploadKey = (key: string, customerId: string): boolean =>
  new RegExp(
    `^(?:\\d+-)?${escapeRegExp(customerUploadFilename(customerId, ""))}`
  ).test(lastKeySegment(key))

const publicFileBaseUrl = (): string => {
  const base = process.env.MINIO_FILE_URL
  if (!base) {
    throw new Error("MINIO_FILE_URL environment variable is not set")
  }
  return base.replace(/\/+$/, "")
}

/** True when `url` points at a file this customer uploaded to our storage. */
export const isCustomerUploadUrl = (url: string, customerId: string): boolean => {
  const base = `${publicFileBaseUrl()}/`
  if (!url.startsWith(base)) {
    return false
  }

  const encodedKey = url.slice(base.length)
  if (!encodedKey || encodedKey.includes("?") || encodedKey.includes("#")) {
    return false
  }

  try {
    return isCustomerUploadKey(decodeURIComponent(encodedKey), customerId)
  } catch {
    return false
  }
}
