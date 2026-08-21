import { Module } from "@medusajs/framework/utils"
import VariantPriceHistoryService from "./service"

export const VARIANT_PRICE_HISTORY_MODULE = "variantPriceHistory"

// Ticaret Bakanlığı'nın "indirime esas alınacak fiyat, indirimden önceki son
// 10 gün içinde uygulanan en düşük fiyat olacak" kuralı (Ticari Reklam ve
// Haksız Ticari Uygulamalar Yönetmeliği, 1 Ağustos 2026 değişikliği).
export const REFERENCE_PRICE_WINDOW_DAYS = 10

export default Module(VARIANT_PRICE_HISTORY_MODULE, {
  service: VariantPriceHistoryService,
})
