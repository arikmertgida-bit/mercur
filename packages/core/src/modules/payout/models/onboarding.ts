import type { JsonRecord } from "@mercurjs/types"
import { model } from '@medusajs/framework/utils'

import { PayoutAccount } from './payout-account'

export const Onboarding = model.define('onboarding', {
  id: model.id({ prefix: 'onb' }).primaryKey(),
  data: model.json<JsonRecord>().nullable(),
  context: model.json<JsonRecord>().nullable(),
  account: model.belongsTo(() => PayoutAccount, {
    mappedBy: 'onboarding'
  })
})
