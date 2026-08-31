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
      // `@mercurjs/admin`'s own build (packages/admin/tsdown.config.ts) now
      // splits its ~29 domains' pages into fine, per-usage chunks (was one
      // ~9MB blob) using Rolldown's `entriesAware` code-splitting — a real,
      // verified improvement to that package's own output.
      //
      // That fix does not carry through to this app's own final bundle,
      // though: get-route-map.tsx's ~180 dynamic route imports (compiled
      // into packages/admin/dist/index.js) converge on a large, genuinely
      // shared core (dashboard-shared, tanstack-table, dnd-kit, etc. used by
      // nearly every page) that this app's own Rolldown pass re-pools when
      // it re-bundles the dependency — verified with the same `entriesAware`
      // grouping applied here too (packages/vendor/apps/vendor, identical
      // architecture): identical output size with or without it, so this is
      // real cross-page sharing, not an artifact of over-eager default
      // pooling. It's downloaded once and cached across every route for the
      // rest of the session, not paid per page visit.
      chunkSizeWarningLimit: 5700,
    },
  }
})
