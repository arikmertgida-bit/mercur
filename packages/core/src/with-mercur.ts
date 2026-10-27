import "./patches/register"

import type { ConfigModule, InputConfigWithArrayModules } from "@medusajs/framework/types"
import { defineConfig } from '@medusajs/framework/utils'
import { assertPatchesDisabled } from "./patches"
import { disableMedusaMiddlewares } from "./utils/disable-medusa-middlewares"

type ProjectConfig = NonNullable<InputConfigWithArrayModules["projectConfig"]>

// Same contract as Medusa's own `defineConfig` input: `projectConfig` itself
// is optional (defineConfig fills in every default when it's absent), but
// once given, its `http` block — with the required store/admin/auth CORS
// strings — is too. Mercur only adds `vendorCors` and the `mercur` block.
export type MercurInputConfig = Omit<InputConfigWithArrayModules, "projectConfig"> & {
  projectConfig?: Omit<ProjectConfig, "http"> & {
    http: ProjectConfig["http"] & {
      vendorCors?: string
    }
    mercur?: {
      /**
       * @deprecated Patches are applied when `@mercurjs/core` is imported,
       * before this config is read. Set `MERCUR_DISABLED_PATCHES` (comma
       * separated) in the process environment instead; listing a patch only
       * here fails the boot.
       */
      disabledPatches?: string[]
    }
  }
}

export function withMercur(config: MercurInputConfig = {}): ConfigModule {
  assertPatchesDisabled(config.projectConfig?.mercur?.disabledPatches)
  disableMedusaMiddlewares()

  const admin = {
    ...config.admin,
    disable: config.admin?.disable ?? true,
  }

  const featureFlags = {
    ...config.featureFlags,
  }

  const modules = [...(config.modules ?? [])]

  const plugins = [
    ...(config.plugins ?? []),
    ...(!config.plugins?.some(
      (p) =>
        (typeof p === "string" ? p : p.resolve) === "@mercurjs/core"
    )
      ? [{ resolve: "@mercurjs/core", options: {} }]
      : []),
  ]

  return defineConfig({
    ...config,
    admin,
    featureFlags,
    modules,
    plugins,
  })
}
