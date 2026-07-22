import { Module } from "@medusajs/framework/utils"
import ReviewReportService from "./service"

export const REVIEW_REPORT_MODULE = "reviewReport"

export default Module(REVIEW_REPORT_MODULE, {
  service: ReviewReportService,
})
