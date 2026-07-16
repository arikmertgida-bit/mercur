import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import type { ModuleProviderExports } from "@medusajs/types"
import StripeConnectProviderService from "./services/stripe-connect"

export * from './types'

const moduleProviderExports: ModuleProviderExports = ModuleProvider(Modules.PAYMENT, {
    services: [StripeConnectProviderService],
})

export default moduleProviderExports