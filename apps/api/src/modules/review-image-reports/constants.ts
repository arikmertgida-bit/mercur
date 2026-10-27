export const REVIEW_IMAGE_REPORT_STATUSES = ["pending", "resolved"] as const

export type ReviewImageReportStatus = (typeof REVIEW_IMAGE_REPORT_STATUSES)[number]

export const REVIEW_IMAGE_REPORT_ACTIONS = ["hidden", "published"] as const

export type ReviewImageReportAction = (typeof REVIEW_IMAGE_REPORT_ACTIONS)[number]
