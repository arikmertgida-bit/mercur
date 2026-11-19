import { MemberInviteDTO, PublicMemberInviteDTO } from "@mercurjs/types"

/** Drops the token: it is the invitee's credential and reaches them by e-mail only. */
export const toPublicMemberInvite = ({
  token: _token,
  ...invite
}: MemberInviteDTO): PublicMemberInviteDTO => invite
