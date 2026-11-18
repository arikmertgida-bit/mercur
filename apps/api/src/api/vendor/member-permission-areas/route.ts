import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MemberAreaPermissions, PermissionRight } from "@mercurjs/types"

import {
  MEMBER_PERMISSION_AREAS,
  MemberPermissionAreaId,
  ROLE_AREA_TEMPLATES,
} from "../../../modules/permissions/member-areas"

export type VendorMemberPermissionAreasResponse = {
  areas: { id: MemberPermissionAreaId; max_right: PermissionRight }[]
  templates: Record<string, MemberAreaPermissions>
}

/** The invite checkbox table and the role templates that prefill it. */
export const GET = async (
  _req: AuthenticatedMedusaRequest,
  res: MedusaResponse<VendorMemberPermissionAreasResponse>
): Promise<void> => {
  res.json({
    areas: MEMBER_PERMISSION_AREAS.map(({ id, max_right }) => ({ id, max_right })),
    templates: ROLE_AREA_TEMPLATES,
  })
}
