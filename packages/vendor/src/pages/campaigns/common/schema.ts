import * as zod from "zod"

export const CreateCampaignSchema = zod.object({
  name: zod.string().min(1),
  description: zod.string().optional(),
  campaign_identifier: zod.string().min(1),
  starts_at: zod.date().nullable(),
  ends_at: zod.date().nullable(),
  budget: zod.object({
    attribute: zod.string().nullish(),
    limit: zod.number().min(0).nullish(),
    type: zod.enum(["spend", "usage", "use_by_attribute"]),
    currency_code: zod.string().nullish(),
  }),
})

export type CreateCampaignValues = zod.infer<typeof CreateCampaignSchema>

/**
 * The form shape `CreateCampaignFormFields` works on: the campaign under
 * `campaign`, next to the promotion's application method when the campaign
 * is created from the promotion flow.
 */
export type CampaignFieldsFormValues = {
  campaign?: CreateCampaignValues
  application_method?: { currency_code?: string | null }
}
