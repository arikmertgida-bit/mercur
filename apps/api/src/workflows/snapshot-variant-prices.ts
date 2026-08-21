import { WorkflowResponse, createWorkflow } from "@medusajs/framework/workflows-sdk"
import {
  CreateVariantPriceSnapshotInput,
  createVariantPriceSnapshotsStep,
} from "./steps/create-variant-price-snapshots"

export type SnapshotVariantPricesWorkflowInput = {
  snapshots: CreateVariantPriceSnapshotInput[]
}

// Daily reference-price compliance job (Ticaret Bakanlığı — Ticari Reklam ve
// Haksız Ticari Uygulamalar Yönetmeliği, 1 Ağustos 2026 değişikliği):
// records each variant's actually-offered price once per day so a genuine
// 10-day floor can be computed later. See ../jobs/snapshot-variant-prices.ts
// for the eligibility/price-resolution logic that builds this input.
export const snapshotVariantPricesWorkflow = createWorkflow(
  "snapshot-variant-prices",
  function (input: SnapshotVariantPricesWorkflowInput) {
    const created = createVariantPriceSnapshotsStep(input.snapshots)
    return new WorkflowResponse(created)
  }
)
