import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { mercurDashboardPlugin } from '@mercurjs/dashboard-sdk/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { visualizer } from 'rollup-plugin-visualizer'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

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
    resolve: {
      alias: {
        // `@mercurjs/vendor/extension-targets` is a build-time marker module the
        // dashboard-sdk emits (imported by `_navigation.ts` and every widget).
        // Vite's dev resolution of that `exports` subpath on the linked workspace
        // package is racy — it intermittently throws "Failed to resolve import ...
        // Does the file exist?" and blanks the app. Pin the exact specifier to the
        // same file the exports map points to so resolution is deterministic.
        '@mercurjs/vendor/extension-targets': path.join(
          rootDir,
          'node_modules/@mercurjs/vendor/dist/extension-targets.js',
        ),
      },
    },
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
      // Most of the old single ~5-8MB chunk was every panel language's
      // translations bundled up front. packages/vendor/src/i18n/translations now
      // loads each language on demand (i18n/backend.ts), so the shared core
      // left here is real code every page uses (React, Medusa UI,
      // dashboard-shared); splitting it further would not shrink what the
      // first page load downloads. A new eagerly bundled dependency that
      // pushes a chunk past this limit should be looked at, not waved through.
      chunkSizeWarningLimit: 1100,
    },
  }
})
