export const PRODUCT_REPORT_STATUSES = ["pending", "resolved", "dismissed"] as const

export type ProductReportStatus = (typeof PRODUCT_REPORT_STATUSES)[number]
