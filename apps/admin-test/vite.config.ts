import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { mercurDashboardPlugin } from '@mercurjs/dashboard-sdk/vite'
import { visualizer } from 'rollup-plugin-visualizer'

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
        logo: '/logo.png',
        ...(backendUrl ? { backendUrl } : {}),
        ...(vendorUrl ? { vendorUrl } : {}),
      }),
      ...(process.env.ANALYZE
        ? [visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true, template: 'treemap' })]
        : []),
    ],
    build: {
      // Most of the old single ~5-8MB chunk was every panel language's
      // translations bundled up front. packages/admin/src/i18n/translations now
      // loads each language on demand (i18n/backend.ts), so the shared core
      // left here is real code every page uses (React, Medusa UI,
      // dashboard-shared); splitting it further would not shrink what the
      // first page load downloads. A new eagerly bundled dependency that
      // pushes a chunk past this limit should be looked at, not waved through.
      chunkSizeWarningLimit: 2700,
    },
  }
})
