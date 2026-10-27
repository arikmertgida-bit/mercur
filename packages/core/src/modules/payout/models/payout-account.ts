import type { JsonRecord } from "@mercurjs/types"
import { model } from "@medusajs/framework/utils";

import { PayoutAccountStatus } from "@mercurjs/types";
import { Onboarding } from "./onboarding";
import { Payout } from "./payout";

export const PayoutAccount = model.define("payout_account", {
  id: model.id({ prefix: "pacc" }).primaryKey(),
  status: model.enum(PayoutAccountStatus).default(PayoutAccountStatus.PENDING),
  data: model.json<JsonRecord>().default({}),
  context: model.json<JsonRecord>().nullable(),
  onboarding: model.hasOne(() => Onboarding, {
    mappedBy: 'account'
  }).nullable(),
  payouts: model.hasMany(() => Payout, {
    mappedBy: 'account'
  }),
});
