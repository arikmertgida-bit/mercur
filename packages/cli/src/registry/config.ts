import type { Config, RawConfig } from "../schema";

/**
 * What registry resolution needs: the aliases and registries, with the
 * project paths only present when a full config was passed in.
 */
export type RegistryResolutionConfig = Omit<Config, "resolvedPaths"> &
  Partial<Pick<Config, "resolvedPaths">>;
import { BUILTIN_REGISTRIES } from "./constants";

export function configWithDefaults(
  config?: Partial<Config> | Config
): RegistryResolutionConfig {
  const defaultConfig: RawConfig = {
    aliases: {
      api: "packages/api/src",
      vendor: "apps/vendor/src",
      admin: "apps/admin/src",
    },
    registries: BUILTIN_REGISTRIES,
  };

  const merged = {
    ...defaultConfig,
    ...(config || {}),
    aliases: {
      ...defaultConfig.aliases,
      ...(config?.aliases || {}),
    },
    registries: {
      // User registries come first so the first one is used as default for unnamespaced deps
      ...(config?.registries || {}),
      ...BUILTIN_REGISTRIES,
    },
  };

  return merged;
}
