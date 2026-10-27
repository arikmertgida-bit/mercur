import { PaginatedResponse, JsonValue } from "@mercurjs/types"
import { z } from "zod"

// A const object rather than a TS `enum`: the dashboards send the status as
// a plain string literal, which a nominal enum type would not accept.
export const RequestStatus = {
  DRAFT: "draft",
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus]

export const RequestStatusFilterSchema = z.union([
  z.nativeEnum(RequestStatus),
  z.array(z.nativeEnum(RequestStatus)),
])

export interface RequestCustomFields {
  id: string
  request_status: RequestStatus
  submitter_id: string | null
  reviewer_id: string | null
  reviewer_note: string | null
  created_at: Date
  updated_at: Date
}

export interface RequestEntityResponse {
  id: string
  custom_fields: RequestCustomFields
  [key: string]: JsonValue | RequestCustomFields
}

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
