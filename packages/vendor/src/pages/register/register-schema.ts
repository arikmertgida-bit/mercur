import { i18n } from "@components/utilities/i18n"
import * as z from "zod"

export const RegisterSchema = z.object({
  first_name: z.string().min(1, { error: () => i18n.t("register.validation.firstNameRequired") }),
  last_name: z.string().min(1, { error: () => i18n.t("register.validation.lastNameRequired") }),
  email: z.string().email({ error: () => i18n.t("register.validation.emailInvalid") }),
  password: z
    .string()
    .min(8, { error: () => i18n.t("register.validation.passwordMinLength") })
    .refine((val) => val.trim().length >= 8, {
      error: () => i18n.t("register.validation.passwordMinLength"),
    })
    .refine((val) => /[a-z]/.test(val) && /[A-Z]/.test(val) && /[\d\W]/.test(val), {
      error: () => i18n.t("register.validation.passwordComplexity"),
    }),
  agreement_accepted: z.boolean().refine((val) => val === true, {
    error: () => i18n.t("register.validation.agreementRequired"),
  }),
})
