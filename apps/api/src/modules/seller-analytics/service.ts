import { MedusaService } from "@medusajs/framework/utils"
import SellerDailyStat from "./models/seller-daily-stat"
import SellerLowStockItem from "./models/seller-low-stock-item"
import PlatformDailyStat from "./models/platform-daily-stat"

class SellerAnalyticsModuleService extends MedusaService({
  SellerDailyStat,
  SellerLowStockItem,
  PlatformDailyStat,
}) {}

export default SellerAnalyticsModuleService
