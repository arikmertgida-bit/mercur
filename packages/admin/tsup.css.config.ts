import { defineConfig } from "tsup";

// Split out from tsup.config.ts: tsdown/Rolldown owns JS output (see
// tsdown.config.ts) for its entriesAware code-splitting, but @tsdown/css
// can't resolve the `@import "@medusajs/dashboard/css"` node_modules
// specifier this file needs, so CSS still goes through tsup/esbuild, which
// handles it natively.
export default defineConfig({
  clean: false,
  dts: false,
  entry: ["src/index.css"],
  format: ["esm"],
});
