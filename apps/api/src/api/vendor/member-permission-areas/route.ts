import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MemberAreaPermissions, PermissionRight } from "@mercurjs/types"

import {
  MEMBER_PERMISSION_AREAS,
  MemberAreaRequirement,
  MemberPermissionAreaId,
  ROLE_AREA_TEMPLATES,
} from "../../../modules/permissions/member-areas"

export type VendorMemberPermissionAreasResponse = {
  areas: {
    id: MemberPermissionAreaId
    max_right: PermissionRight
    requires: MemberAreaRequirement[]
  }[]
  templates: Record<string, MemberAreaPermissions>
}

/** The invite checkbox table and the role templates that prefill it. */
export const GET = async (
  _req: AuthenticatedMedusaRequest,
  res: MedusaResponse<VendorMemberPermissionAreasResponse>
): Promise<void> => {
  res.json({
    areas: MEMBER_PERMISSION_AREAS.map(({ id, max_right, requires }) => ({
      id,
      max_right,
      requires: requires ?? [],
    })),
    templates: ROLE_AREA_TEMPLATES,
  })
}
