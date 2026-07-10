import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MercurModules } from "@mercurjs/types"

import CustomFieldsModuleService, {
  CustomFieldRow,
} from "../../../modules/custom-fields/services/custom-fields-module-service"

type CustomFieldEntry = { id: string } & Record<
  string,
  string | number | boolean | Date | null
>

type UpsertCustomFieldsStepInput = {
  alias: string
  data: CustomFieldEntry | CustomFieldEntry[]
}

type UpsertCustomFieldsCompensateInput = {
  alias: string
  ownerIds: string[]
  previousRows: CustomFieldRow[]
}

export const upsertCustomFieldsStep = createStep(
  "upsert-custom-fields",
  async (input: UpsertCustomFieldsStepInput, { container }) => {
    const service = container.resolve<CustomFieldsModuleService>(MercurModules.CUSTOM_FIELDS)

    const entries = Array.isArray(input.data) ? input.data : [input.data]
    const ownerIds = entries.map((entry) => entry.id)

    // Snapshot rows that already existed so compensate can tell inserts
    // (new rows to delete) apart from updates (rows to restore).
    const previousRows = await service.listByOwnerIds(input.alias, ownerIds)

    const result = await service.upsert(input.alias, input.data)

    return new StepResponse(result, { alias: input.alias, ownerIds, previousRows })
  },
  async (compensateInput: UpsertCustomFieldsCompensateInput | undefined, { container }) => {
    if (!compensateInput) {
      return
    }

    const service = container.resolve<CustomFieldsModuleService>(MercurModules.CUSTOM_FIELDS)
    const { alias, ownerIds, previousRows } = compensateInput

    const previousIds = new Set(previousRows.map((row) => row.id))
    const freshlyInsertedIds = ownerIds.filter((id) => !previousIds.has(id))

    if (freshlyInsertedIds.length) {
      await service.delete(alias, freshlyInsertedIds)
    }

    const rowsToRestore = previousRows.filter((row) => previousIds.has(row.id))
    if (rowsToRestore.length) {
      const AUDIT_COLUMNS = ["created_at", "updated_at", "deleted_at"]
      const restoreEntries = rowsToRestore.map((row) => {
        const fields: CustomFieldEntry = { id: row.id }
        for (const [key, value] of Object.entries(row)) {
          if (key === "id" || AUDIT_COLUMNS.includes(key)) {
            continue
          }
          fields[key] = value
        }
        return fields
      })
      await service.upsert(alias, restoreEntries)
    }
  }
)
