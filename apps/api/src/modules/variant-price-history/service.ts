import { MedusaService } from "@medusajs/framework/utils"
import VariantPriceSnapshot from "./models/variant-price-snapshot"

class VariantPriceHistoryService extends MedusaService({ VariantPriceSnapshot }) {}

export default VariantPriceHistoryService
