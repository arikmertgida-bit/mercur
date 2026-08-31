import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import type {
  IAuthModuleService,
  ICustomerModuleService,
} from "@medusajs/framework/types"

const AUTH_PROVIDER_EMAILPASS = "emailpass"
const CUSTOMER_APP_METADATA_KEY = "customer_id"

export type ReleaseCustomerAuthIdentityStepInput = {
  customerId: string
}

export type ReleasedAuthIdentity = {
  authIdentityId: string
  previousValue: string | null
}

/**
 * After a customer is deleted, Medusa's own delete flow (`removeCustomerAccountWorkflow`)
 * sets the linked auth_identity's `app_metadata.customer_id` to `null` — it does not
 * remove the key. Since `{ customer_id: null }` is still a non-empty object, the
 * `emailpass` auth provider's "is this identity claimable again?" check
 * (`isPresent(app_metadata)`) treats the identity as still claimed, permanently
 * blocking re-registration with the same email. This step removes the stale key so
 * the identity becomes genuinely claimable again, matching the state Medusa's own
 * `setAuthAppMetadataStep` compensation function already treats as correct.
 */
export const releaseCustomerAuthIdentityStep = createStep(
  "release-customer-auth-identity",
  async (
    input: ReleaseCustomerAuthIdentityStepInput,
    { container }
  ) => {
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )
    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH
    )

    const [customer] = await customerModuleService.listCustomers(
      { id: [input.customerId] },
      { withDeleted: true }
    )

    if (!customer || !customer.has_account || customer.email.length === 0) {
      return new StepResponse<ReleasedAuthIdentity[]>([], [])
    }

    const authIdentities = await authModuleService.listAuthIdentities({
      provider_identities: {
        entity_id: customer.email,
        provider: AUTH_PROVIDER_EMAILPASS,
      },
    })

    const released: ReleasedAuthIdentity[] = []

    for (const identity of authIdentities) {
      const appMetadata: Record<string, unknown> = {
        ...(identity.app_metadata ?? {}),
      }

      if (!(CUSTOMER_APP_METADATA_KEY in appMetadata)) {
        continue
      }

      const rawValue = appMetadata[CUSTOMER_APP_METADATA_KEY]
      const previousValue: string | null =
        typeof rawValue === "string" ? rawValue : null

      delete appMetadata[CUSTOMER_APP_METADATA_KEY]

      // Medusa's underlying repository merges a JSON `app_metadata` update
      // into the stored object rather than replacing it — an omitted key
      // survives the merge, so `delete`-ing it locally and sending the
      // trimmed object back leaves the stale key in place (verified live).
      // Passing `null` for the whole column is the only way that actually
      // clears it; the SDK's DTO type doesn't model that even though the
      // underlying model field is nullable and this is the documented way
      // to remove an actor association.
      if (Object.keys(appMetadata).length === 0) {
        // @ts-expect-error — UpdateAuthIdentityDTO.app_metadata is typed as
        // Record<string, unknown> only, but the auth_identity model column
        // is nullable and a real update requires null here to replace
        // rather than merge (see comment above).
        await authModuleService.updateAuthIdentities({
          id: identity.id,
          app_metadata: null,
        })
      } else {
        await authModuleService.updateAuthIdentities({
          id: identity.id,
          app_metadata: appMetadata,
        })
      }

      released.push({ authIdentityId: identity.id, previousValue })
    }

    return new StepResponse<ReleasedAuthIdentity[]>(released, released)
  },
  async (released, { container }) => {
    if (!released || released.length === 0) {
      return
    }

    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH
    )

    for (const entry of released) {
      const identity = await authModuleService.retrieveAuthIdentity(
        entry.authIdentityId
      )
      const appMetadata: Record<string, unknown> = {
        ...(identity.app_metadata ?? {}),
      }
      appMetadata[CUSTOMER_APP_METADATA_KEY] = entry.previousValue

      await authModuleService.updateAuthIdentities({
        id: identity.id,
        app_metadata: appMetadata,
      })
    }
  }
)
