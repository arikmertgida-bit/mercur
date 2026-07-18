import "@mercurjs/vendor/extension-targets"
import { defineNavigationConfig } from "@mercurjs/dashboard-sdk"

export default defineNavigationConfig({
  items: [
    { id: "orders", rank: 0 },
    { id: "products", rank: 1 },
    { id: "inventory", rank: 2 },
    { id: "price-lists", rank: 3 },
    { id: "customers", rank: 4 },
    { id: "promotions", rank: 5 },
    { id: "campaigns", nested: "promotions" },
    { id: "payouts", rank: 6 },
  ],
})
