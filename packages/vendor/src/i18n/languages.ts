import { Language } from "./types"

export const languages: Language[] = [
  {
    code: "bs",
    display_name: "Bosanski",
    ltr: true,
    intl_locale: "bs",
  },
  {
    code: "bg",
    display_name: "Български",
    ltr: true,
    intl_locale: "bg",
  },
  {
    code: "en",
    display_name: "English",
    ltr: true,
    intl_locale: "en",
  },
  {
    code: "es",
    display_name: "Español",
    ltr: true,
    intl_locale: "es",
  },
  {
    code: "el",
    display_name: "Ελληνικά",
    ltr: true,
    intl_locale: "el",
  },
  {
    code: "de",
    display_name: "Deutsch",
    ltr: true,
    intl_locale: "de",
  },
  {
    code: "fr",
    display_name: "Français",
    ltr: true,
    intl_locale: "fr",
  },
  {
    code: "he",
    display_name: "עברית",
    ltr: false,
    intl_locale: "he",
  },
  {
    code: "hu",
    display_name: "Magyar",
    ltr: true,
    intl_locale: "hu",
  },
  {
    code: "it",
    display_name: "Italiano",
    ltr: true,
    intl_locale: "it",
  },
  {
    code: "ja",
    display_name: "日本語",
    ltr: true,
    intl_locale: "ja",
  },
  {
    code: "pl",
    display_name: "Polski",
    ltr: true,
    intl_locale: "pl",
  },
  {
    code: "pt-BR",
    display_name: "Português (Brasil)",
    ltr: true,
    intl_locale: "pt-BR",
  },
  {
    code: "pt-PT",
    display_name: "Português (Portugal)",
    ltr: true,
    intl_locale: "pt-PT",
  },
  {
    code: "tr",
    display_name: "Türkçe",
    ltr: true,
    intl_locale: "tr",
  },
  {
    code: "th",
    display_name: "ไทย",
    ltr: true,
    intl_locale: "th",
  },
  {
    code: "uk",
    display_name: "Українська",
    ltr: true,
    intl_locale: "uk",
  },
  {
    code: "ro",
    display_name: "Română",
    ltr: true,
    intl_locale: "ro",
  },
  {
    code: "mk",
    display_name: "Македонски",
    ltr: true,
    intl_locale: "mk",
  },
  {
    code: "mn",
    display_name: "Монгол",
    ltr: true,
    intl_locale: "mn",
  },
  {
    code: "ar",
    display_name: "العربية",
    ltr: false,
    intl_locale: "ar",
  },
  {
    code: "zh-CN",
    display_name: "简体中文",
    ltr: true,
    intl_locale: "zh-CN",
  },
  {
    code: "fa",
    display_name: "فارسی",
    ltr: false,
    intl_locale: "fa",
  },
  {
    code: "cs",
    display_name: "Čeština",
    ltr: true,
    intl_locale: "cs",
  },
  {
    code: "ru",
    display_name: "Русский",
    ltr: true,
    intl_locale: "ru",
  },
  {
    code: "lt",
    display_name: "Lietuviškai",
    ltr: true,
    intl_locale: "lt",
  },
  {
    code: "vi",
    display_name: "Tiếng Việt",
    ltr: true,
    intl_locale: "vi",
  },
  {
    code: "id",
    display_name: "Bahasa Indonesia",
    ltr: true,
    intl_locale: "id",
  },
  {
    code: "ko",
    display_name: "한국어",
    ltr: true,
    intl_locale: "ko",
  },
  {
    code: "nl",
    display_name: "Nederlands",
    ltr: true,
    intl_locale: "nl",
  },
  {
    code: "zh-TW",
    display_name: "繁體中文(臺灣)",
    ltr: true,
    intl_locale: "zh-TW",
  },
]

/**
 * Converts an i18next language code to a BCP-47 tag safe to pass into
 * `Intl.*`/`Date#toLocale*`. See `Language["intl_locale"]` in `./types`.
 */
export const toIntlLocale = (languageCode: string): string =>
  languages.find((language) => language.code === languageCode)?.intl_locale ??
  languageCode
