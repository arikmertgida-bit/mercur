import { AuthenticatedMedusaRequest } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

/**
 * Every `/vendor/sellers/:id*` route lets the vendor panel pass its own
 * seller id explicitly (see packages/vendor/src/hooks/api/sellers.tsx,
 * members.tsx, invites.tsx) instead of always resolving "me" server-side —
 * but nothing compared that id against the authenticated member's own
 * seller, so any vendor member could read/write ANY seller's profile, bank
 * details, or team roster by swapping the :id in the URL. Every handler on
 * this sub-tree must call this before touching data.
 */
export function assertOwnSeller(req: AuthenticatedMedusaRequest): void {
  if (req.params.id !== req.seller_context!.seller_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "You do not have access to this seller account"
    )
  }
}

/**
 * `assertOwnSeller` only proves the caller belongs to `:id` — the
 * `updateMemberRoleWorkflow`/`removeSellerMemberWorkflow` steps then act on
 * `:member_id` alone, with no seller filter of their own, so a caller could
 * still target another seller's `seller_member` row by id. Confirms
 * `:member_id` is actually a member of `:id` before those workflows run.
 */
export async function assertMemberOfSeller(
  req: AuthenticatedMedusaRequest
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: sellerMembers } = await query.graph({
    entity: "seller_member",
    fields: ["id"],
    filters: {
      id: req.params.member_id,
      seller_id: req.params.id,
    },
  })

  if (!sellerMembers.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Seller member with id: ${req.params.member_id} was not found`
    )
  }
}
