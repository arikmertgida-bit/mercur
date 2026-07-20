import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { mercurDashboardPlugin } from '@mercurjs/dashboard-sdk/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl =
    env.VITE_MERCUR_BACKEND_URL || env.MERCUR_BACKEND_URL
  const vendorUrl =
    env.VITE_MERCUR_VENDOR_URL || env.MERCUR_VENDOR_URL

  return {
    define: {
      __MESSENGER_URL__: JSON.stringify(env.VITE_MESSENGER_URL || 'http://localhost:4000'),
      __STOREFRONT_URL__: JSON.stringify(env.VITE_STOREFRONT_URL || 'http://localhost:3000'),
    },
    plugins: [
      react(),
      mercurDashboardPlugin({
        medusaConfigPath: '../api/medusa-config.ts',
        name: 'Kayı.com',
        ...(backendUrl ? { backendUrl } : {}),
        ...(vendorUrl ? { vendorUrl } : {}),
      }),
    ],
    build: {
      // The dashboard's ~150 routes share one large common chunk (medusa-ui,
      // tanstack-table, dashboard-shared) that Rollup groups automatically so
      // it's downloaded once and cached across pages. That's expected for
      // this app's size, not a regression — raise the threshold instead of
      // forcing a manual split that breaks Rollup's own dedup and bloats the
      // entry chunk (verified: manualChunks made the entry 552kB -> 3.79MB).
      chunkSizeWarningLimit: 4000,
    },
  }
})
