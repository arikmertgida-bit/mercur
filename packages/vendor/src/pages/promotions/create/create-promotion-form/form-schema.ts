import i18n from "i18next"
import { z } from "zod"
import { CreateCampaignSchema } from "@pages/campaigns/create/create-campaign-form/create-campaign-form"

const RuleSchema = z.array(
  z.object({
    id: z.string().optional(),
    attribute: z.string().min(1, { message: i18n.t("validation.requiredField") }),
    operator: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.enum(["gt", "lt", "eq", "ne", "in", "lte", "gte"], {
        required_error: i18n.t("validation.requiredField"),
        invalid_type_error: i18n.t("validation.requiredField"),
      })
    ),
    values: z.union([
      z.number().min(1, { message: i18n.t("validation.requiredField") }),
      z.string().min(1, { message: i18n.t("validation.requiredField") }),
      z.array(z.string()).min(1, { message: i18n.t("validation.requiredField") }),
    ]),
    required: z.boolean().optional(),
    disguised: z.boolean().optional(),
    field_type: z.string().optional(),
  })
)

export const CreatePromotionSchema = z
  .object({
    template_id: z.string().optional(),
    campaign_id: z.string().optional(),
    campaign_choice: z.enum(["none", "existing", "new"]).optional(),
    is_automatic: z.string().toLowerCase(),
    type: z.enum(["buyget", "standard"]),
    status: z.enum(["draft", "active", "inactive"]),
    rules: RuleSchema,
    application_method: z.object({
      allocation: z.enum(["each", "across"]),
      value: z.number().min(0),
      currency_code: z.string().optional(),
      max_quantity: z.number().optional().nullable(),
      target_rules: RuleSchema,
      buy_rules: RuleSchema,
      type: z.enum(["fixed", "percentage"]),
      target_type: z.enum(["order", "shipping_methods", "items"]),
    }),
    campaign: CreateCampaignSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.application_method.allocation === "across") {
        return true
      }

      return (
        data.application_method.allocation === "each" &&
        typeof data.application_method.max_quantity === "number"
      )
    },
    {
      path: ["application_method.max_quantity"],
      message: i18n.t("validation.requiredField"),
    }
  )

// The currency-required-for-fixed-type and buyget-conditions-required business
// rules are intentionally enforced in create-promotion-form.tsx's onSubmit,
// not here: react-hook-form's zodResolver returns `values: {}` whenever
// `.parse()` throws, and RHF only treats `errors.root` as an informational,
// non-blocking form-level error (documented RHF behavior — a `path: ["root"]`
// Zod refine's failure does not stop handleSubmit's success branch from
// running). A `.refine()` here would silently hand the submit handler an
// empty `data` object instead of blocking submission.
export type CreatePromotionSchemaType = z.infer<typeof CreatePromotionSchema>
