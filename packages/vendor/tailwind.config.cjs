const path = require("path")

const medusaUI = path.join(
  path.dirname(require.resolve("@medusajs/ui")),
  "**/*.{js,jsx,ts,tsx}"
)

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@medusajs/ui-preset")],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../apps/vendor/src/**/*.{js,ts,jsx,tsx}",
    "../dashboard-shared/src/**/*.{js,ts,jsx,tsx}",
    medusaUI,
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Kayı.com brand red — same value as the storefront's `brand` token
        // (colors.css → rgba(var(--brand-red)), 227,10,23). Kept as a single
        // named color here so review-related UI (unread badge, "Cevap
        // Bekliyor" status) never hardcodes the hex inline.
        brand: "#e30a17",
      },
    },
  },
  plugins: [],
}
