import { DefaultValues } from "react-hook-form"

import { CreatePromotionSchemaType } from "./form-schema"
import { PromotionTemplate } from "./templates"

export type PromotionFormDefaults = DefaultValues<CreatePromotionSchemaType>

export const applyTemplateDefaults = (
  base: PromotionFormDefaults,
  template: PromotionTemplate
): PromotionFormDefaults => {
  const { is_automatic, type, application_method } = template.defaults
  const applicationMethod = { ...base.application_method }

  if (application_method.allocation !== undefined) {
    applicationMethod.allocation = application_method.allocation
  }
  if (application_method.target_type !== undefined) {
    applicationMethod.target_type = application_method.target_type
  }
  if (application_method.type !== undefined) {
    applicationMethod.type = application_method.type
  }
  if (application_method.value !== undefined) {
    applicationMethod.value = application_method.value
  }
  if (application_method.max_quantity !== undefined) {
    applicationMethod.max_quantity = application_method.max_quantity
  }
  // `across` allocation forbids max_quantity.
  if (application_method.allocation === "across") {
    applicationMethod.max_quantity = null
  }

  return {
    ...base,
    template_id: template.id,
    is_automatic,
    type,
    application_method: applicationMethod,
  }
}
