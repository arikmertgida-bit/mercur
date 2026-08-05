import { z } from "zod"
import { MedusaError } from "@medusajs/framework/utils"
import { PaginatedResponse } from "@mercurjs/types"
import { JsonPrimitiveSchema } from "../lib/graph-schemas"

// The finite set of entities the requests/approvals system supports.
// `req.params.type` arrives as a plain route-param string; query.graph()
// can only infer a real (non-`any`) return type when `entity` is narrowed
// to one of these literals first — see parseRequestEntityType below.
export const REQUEST_ENTITY_TYPES = [
  "product_category",
  "product_collection",
  "product_tag",
  "product_type",
  "return_reason",
] as const
export type RequestEntityType = (typeof REQUEST_ENTITY_TYPES)[number]
export const RequestEntityTypeSchema = z.enum(REQUEST_ENTITY_TYPES)

export const parseRequestEntityType = (type: string): RequestEntityType => {
  const result = RequestEntityTypeSchema.safeParse(type)
  if (!result.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported request type "${type}"`
    )
  }
  return result.data
}

// A const object (rather than a TS `enum`) so RequestStatus stays a plain
// string-literal union structurally, not a nominal enum type — the admin and
// vendor dashboards only ever produce plain strings from the URL/table
// filters, and those need to be directly assignable without a cast.
export const RequestStatus = {
  DRAFT: "draft",
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus]

export const RequestCustomFieldsSchema = z.object({
  id: z.string(),
  request_status: z.nativeEnum(RequestStatus),
  submitter_id: z.string().nullable(),
  reviewer_id: z.string().nullable(),
  reviewer_note: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
})
export type RequestCustomFields = z.infer<typeof RequestCustomFieldsSchema>

// The custom_fields link is attached to entities at runtime via
// MedusaModule.setCustomLink (see @mercurjs/core/modules/custom-fields), so
// query.graph's static entity types (ProductCollection, ProductCategory, ...)
// never declare it. Parsing the response through this schema both validates
// the dynamic link data and gives it an honest, non-`any` type.
export const RequestEntityResponseSchema = z
  .object({
    id: z.string(),
    custom_fields: RequestCustomFieldsSchema,
  })
  .catchall(JsonPrimitiveSchema)
export type RequestEntityResponse = z.infer<typeof RequestEntityResponseSchema>

// Generic rather than `unknown`/`any`: query.graph()'s actual return type
// at every call site is either a real inferred entity shape (vendor routes,
// which pass a literal entity string) or the literal-narrowed union from
// parseRequestEntityType (admin routes) — never truly arbitrary. Zod's own
// `.parse()` accepts `unknown` internally regardless of what concrete `T`
// is passed in, so this stays a real runtime validation boundary without
// exposing `unknown` in this module's own signatures.
export const parseRequestEntity = <T>(entity: T): RequestEntityResponse =>
  RequestEntityResponseSchema.parse(entity)

// Entities created outside the request/approval workflow (e.g. an admin creating a
// category directly through the standard Medusa admin panel, which never goes through
// `createProductCategoryRequestWorkflow`) never get a `custom_fields` link row at all —
// that's expected, not corrupt data, since they were never actually "requested". List
// endpoints use this lenient variant so one such row doesn't 500 the entire list; it
// simply excludes rows with no request history, which is exactly what a request/approval
// queue should show. Detail/accept/reject endpoints keep the strict `parseRequestEntity`
// above — reaching one of those for an unlinked entity is a genuine caller error.
export const parseRequestEntitySafe = <T>(entity: T): RequestEntityResponse | null => {
  const result = RequestEntityResponseSchema.safeParse(entity)
  return result.success ? result.data : null
}

export const isRequestEntity = (
  entity: RequestEntityResponse | null
): entity is RequestEntityResponse => entity !== null

// No shared `parseRequestEntityList` helper: query.graph() over the 4-way
// `RequestEntityType` union returns a union of 4 distinct array types
// (`ProductCategory[] | ProductCollection[] | ...`), which does not unify
// against a single `T[]` parameter the way TypeScript infers a per-element
// callback. Call sites use `entities.map(parseRequestEntity)` directly,
// which lets TypeScript instantiate the generic per element instead and
// handles the union correctly.

export const RequestStatusFilterSchema = z.union([
  z.nativeEnum(RequestStatus),
  z.array(z.nativeEnum(RequestStatus)),
])

export interface AdminRequestResponse {
  request: RequestEntityResponse
}

export type AdminRequestListResponse = PaginatedResponse<{
  requests: RequestEntityResponse[]
}>

export interface VendorRequestResponse {
  request: RequestEntityResponse
}

export type VendorRequestListResponse = PaginatedResponse<{
  requests: RequestEntityResponse[]
}>
