import { I18nProvider as UiI18nProvider } from "@medusajs/ui"
import { PropsWithChildren } from "react"
import { useTranslation } from "react-i18next"

import { languages } from "../../i18n/languages"

/**
 * Gives @medusajs/ui (react-aria) components the panel language. Without a
 * `locale`, react-aria falls back to the browser language, so date fields
 * would read their labels in the OS language instead of the selected one.
 */
export const I18nProvider = ({ children }: PropsWithChildren) => {
  const { i18n } = useTranslation()

  const locale =
    languages.find((language) => language.code === i18n.language)
      ?.intl_locale ?? "en"

  return <UiI18nProvider locale={locale}>{children}</UiI18nProvider>
}
