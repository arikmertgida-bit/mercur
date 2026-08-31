import { defineConfig } from "tsdown";

// `src/pages/index.ts` re-exports every domain page via `export *`, and
// get-route-map.tsx dynamically imports each individual page. esbuild (tsup)
// pools nearly everything reachable from 2+ of those import sites into one
// ~9MB shared chunk regardless of entry boundaries (verified for the
// equivalent packages/vendor package — same architecture, same result).
// Rolldown's `entriesAware` group option splits a group's modules by which
// *specific set* of importers actually uses them, instead of pooling
// everything into one bucket. Applied only to this package's own
// `src/pages/` source (not node_modules — third-party deps are already well
// split by Rolldown's default heuristic), it turns the one multi-MB chunk
// into per-page/per-domain-combination chunks in the ~KB range.
//
// `.d.ts` generation stays on tsup (tsup.config.ts) — rolldown-plugin-dts
// can't resolve `@mercurjs/dashboard-sdk`'s deep transitive types. CSS stays
// on tsup too (tsup.css.config.ts) — @tsdown/css can't resolve the
// `@medusajs/dashboard/css` node_modules import this package's CSS needs.
export default defineConfig({
  clean: true,
  dts: false,
  entry: ["src/index.ts", "src/pages/index.ts"],
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
