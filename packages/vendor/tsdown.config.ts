import { defineConfig } from "tsdown";

// `src/pages/index.ts` re-exports every domain page via `export *`, and
// get-route-map.tsx dynamically imports each individual page. esbuild (tsup)
// pools nearly everything reachable from 2+ of those import sites into one
// ~9MB shared chunk regardless of entry boundaries, because it has no way to
// tell "shared by domain A+B" apart from "shared by everyone" (verified: adding
// a tsup entry per domain didn't change the shared chunk's size at all).
// Rolldown's `entriesAware` group option does exactly that — it splits a
// group's modules by which *specific set* of importers actually uses them,
// instead of pooling everything into one bucket. Applied only to this
// package's own `src/pages/` source (not node_modules — third-party deps are
// already well split by Rolldown's default heuristic), it turns the one
// multi-MB chunk into per-page/per-domain-combination chunks in the ~KB range.
//
// Each domain also gets its own entry (`src/pages/<domain>/index.ts`), so it
// compiles to a stable `dist/pages/<domain>/index.js` — exposed as
// `@mercurjs/vendor/pages/<domain>` in package.json. A consumer that only
// needs one domain (e.g. an app overriding a single page via the compound-
// component pattern) can import that instead of the full `./pages` barrel;
// without this, importing even one page through the barrel makes every
// domain "statically needed" downstream, which defeats entriesAware one
// layer up in the consuming app's own bundler (verified: apps/vendor's build
// stayed at ~6MB either way until its one `./pages` import was narrowed to
// `./pages/products`).
//
// `.d.ts` generation stays on tsup (tsup.config.ts) — rolldown-plugin-dts
// can't resolve `@mercurjs/dashboard-sdk`'s deep transitive types. CSS stays
// on tsup too (tsup.css.config.ts) — @tsdown/css can't resolve the
// `@medusajs/dashboard/css` node_modules import this package's CSS needs.
export default defineConfig({
  clean: true,
  dts: false,
  entry: [
    "src/index.ts",
    "src/pages/index.ts",
    "src/pages/campaigns/index.ts",
    "src/pages/categories/index.ts",
    "src/pages/collections/index.ts",
    "src/pages/customers/index.ts",
    "src/pages/inventory/index.ts",
    "src/pages/login/index.ts",
    "src/pages/orders/index.ts",
    "src/pages/payouts/index.ts",
    "src/pages/price-lists/index.ts",
    "src/pages/products/index.ts",
    "src/pages/promotions/index.ts",
    "src/pages/settings/index.ts",
  ],
  format: ["esm"],
  outExtensions: () => ({ js: ".js" }),
  deps: {
    neverBundle: ["react", "react-dom", "@mercurjs/dashboard-sdk", "vite", "esbuild", "postcss", "virtual:mercur/config", "virtual:mercur/routes", "virtual:mercur/menu-items", "virtual:mercur/i18n", "virtual:mercur/widgets", "virtual:mercur/navigation", "virtual:mercur/custom-fields"],
  },
  outputOptions: {
    codeSplitting: {
      groups: [
        {
          name: (moduleId) =>
            !/node_modules/.test(moduleId) && /[\\/]src[\\/]pages[\\/]/.test(moduleId)
              ? "pages"
              : null,
          entriesAware: true,
        },
      ],
    },
  },
});
