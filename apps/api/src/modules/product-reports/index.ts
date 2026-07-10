import { Module } from "@medusajs/framework/utils"
import ProductReportService from "./service"

export const PRODUCT_REPORT_MODULE = "productReport"

export default Module(PRODUCT_REPORT_MODULE, {
  service: ProductReportService,
})
