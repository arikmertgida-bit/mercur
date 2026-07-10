import { Module } from "@medusajs/framework/utils"
import ReviewImageReportService from "./service"

export const REVIEW_IMAGE_REPORT_MODULE = "reviewImageReport"

export default Module(REVIEW_IMAGE_REPORT_MODULE, {
  service: ReviewImageReportService,
})
