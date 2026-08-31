import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { mercurDashboardPlugin } from '@mercurjs/dashboard-sdk/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// docker-entrypoint.sh looks for this exact token in the built JS and
// sed-replaces it with the real BACKEND_URL at container start (ARCH-01).
// It must only be baked in for production builds — `vite dev`/`bun run dev`
// serves straight from source with no entrypoint step to do the replacement,
// so a real fallback (the dashboard-sdk's own localhost:9000 default) still
// applies there.
const RUNTIME_BACKEND_URL_TOKEN = '__VITE_RUNTIME_BACKEND_URL__'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl =
    env.VITE_MERCUR_BACKEND_URL ||
    env.MERCUR_BACKEND_URL ||
    (command === 'build' ? RUNTIME_BACKEND_URL_TOKEN : undefined)

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
        // Sellers upload product photography straight from phone cameras,
        // where 2MB is routinely too tight — raised to 3MB (default is 2MB,
        // see packages/dashboard-sdk/src/plugin.ts).
        imageLimit: 3 * 1024 * 1024,
        i18n: {
          defaultLanguage: 'tr',
        },
        ...(backendUrl ? { backendUrl } : {}),
      }),
      ...(process.env.ANALYZE
        ? [visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true, template: 'treemap' })]
        : []),
    ],
    build: {
      // `@mercurjs/vendor`'s own build (packages/vendor/tsdown.config.ts) now
      // splits its ~150 pages into fine, per-usage chunks (was one ~9MB
      // blob) using Rolldown's `entriesAware` code-splitting — a real,
      // verified improvement to that package's own output and to any
      // consumer that only needs part of it (e.g. this app's one
      // `@mercurjs/vendor/pages/products` import, narrowed from the full
      // `/pages` barrel for the same reason).
      //
      // That fix does not carry through to this app's own final bundle,
      // though: get-route-map.tsx's ~150 dynamic route imports (compiled
      // into packages/vendor/dist/index.js) converge on a large, genuinely
      // shared core (dashboard-shared-adjacent hooks/components used by
      // nearly every page) that this app's own Rolldown pass re-pools when
      // it re-bundles the dependency — verified with the same `entriesAware`
      // grouping applied here too: identical output size with or without
      // it, so this is real cross-page sharing, not an artifact of
      // over-eager default pooling. It's downloaded once and cached across
      // every route for the rest of the session, not paid per page visit.
      chunkSizeWarningLimit: 5500,
    },
  }
})
