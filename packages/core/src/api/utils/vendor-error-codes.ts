/**
 * MedusaError codes the app's vendor error layer (apps/api
 * vendor-error-i18n) translates. Kept free of imports so the error layer can
 * read them without loading routes or workflows.
 */
export const SELLER_IMAGE_NOT_OWNED_CODE = "seller_image_not_owned"
export const MEMBER_INVITE_EMAIL_MISMATCH_CODE = "member_invite_email_mismatch"
export const MEMBER_PERMISSIONS_INVALID_CODE = "member_permissions_invalid"
export const MEMBER_PERMISSIONS_ESCALATION_CODE = "member_permissions_escalation"
export const SELLER_PENDING_APPROVAL_CODE = "seller_pending_approval"
export const SELLER_SUSPENDED_CODE = "seller_suspended"
export const SELLER_TERMINATED_CODE = "seller_terminated"
