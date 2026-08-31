import { defineConfig } from "tsup";

// JS output moved to tsdown.config.ts (Rolldown's entriesAware code-splitting
// avoids the single multi-MB shared chunk esbuild produced for this page
// tree). tsup still owns `.d.ts` generation here — tsdown's dts engine
// (rolldown-plugin-dts) fails trying to fully resolve `@mercurjs/dashboard-sdk`'s
// `BuiltMercurConfig` type (referenced only by the ambient `virtual:mercur/config`
// declaration in src/module.d.ts) through its very deep transitive Medusa
// framework type graph; tsup's dts engine handles this fine. CSS still goes
// through tsup too, in tsup.css.config.ts.
export default defineConfig({
  clean: false,
  dts: { only: true },
  entry: ["src/index.ts", "src/pages/index.ts"],
  format: ["esm"],
  external: ["react", "react-dom", "virtual:mercur/config", "virtual:mercur/routes", "virtual:mercur/menu-items", "virtual:mercur/i18n", "virtual:mercur/widgets", "virtual:mercur/navigation", "virtual:mercur/custom-fields"],
});
