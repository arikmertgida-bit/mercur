import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncCustomFields } from "@mercurjs/core/modules/custom-fields"

import { KAYI_CUSTOM_FIELDS_OPTIONS } from "../../apps/api/src/lib/custom-fields-config"

type PgConnectionConfig = string | { connectionString?: string }

/**
 * `medusa db:migrate` creates the `<entity>_custom_fields` tables; the test
 * runner migrates in-process without that command, so a spec that reads them
 * (request status of return reasons, tags…) creates them in its own database.
 */
export const syncTestCustomFields = async (
  container: MedusaContainer
): Promise<void> => {
  const pg = container.resolve<{ client: { config: { connection: PgConnectionConfig } } }>(
    ContainerRegistrationKeys.PG_CONNECTION
  )
  const connection = pg.client.config.connection
  const clientUrl =
    typeof connection === "string" ? connection : connection.connectionString

  await syncCustomFields(
    container.resolve(ContainerRegistrationKeys.LOGGER),
    KAYI_CUSTOM_FIELDS_OPTIONS.customFields ?? {},
    clientUrl
  )
}
