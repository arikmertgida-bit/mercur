import type { Locale } from "date-fns"
import { enUS } from "date-fns/locale/en-US"

/**
 * One date-fns locale per panel language, each in its own chunk. The
 * translation backend (`i18n/backend.ts`) loads a language's locale together
 * with its translations, so by the time i18next switches to a language its
 * locale is already here and `getDateLocale` can stay synchronous.
 */
const dateLocaleLoaders: Record<string, () => Promise<Locale>> = {
  ar: () => import("date-fns/locale/ar").then((m) => m.ar),
  bg: () => import("date-fns/locale/bg").then((m) => m.bg),
  bs: () => import("date-fns/locale/bs").then((m) => m.bs),
  cs: () => import("date-fns/locale/cs").then((m) => m.cs),
  de: () => import("date-fns/locale/de").then((m) => m.de),
  el: () => import("date-fns/locale/el").then((m) => m.el),
  en: () => Promise.resolve(enUS),
  es: () => import("date-fns/locale/es").then((m) => m.es),
  fa: () => import("date-fns/locale/fa-IR").then((m) => m.faIR),
  fr: () => import("date-fns/locale/fr").then((m) => m.fr),
  he: () => import("date-fns/locale/he").then((m) => m.he),
  hu: () => import("date-fns/locale/hu").then((m) => m.hu),
  id: () => import("date-fns/locale/id").then((m) => m.id),
  it: () => import("date-fns/locale/it").then((m) => m.it),
  ja: () => import("date-fns/locale/ja").then((m) => m.ja),
  ko: () => import("date-fns/locale/ko").then((m) => m.ko),
  lt: () => import("date-fns/locale/lt").then((m) => m.lt),
  mk: () => import("date-fns/locale/mk").then((m) => m.mk),
  mn: () => import("date-fns/locale/mn").then((m) => m.mn),
  nl: () => import("date-fns/locale/nl").then((m) => m.nl),
  pl: () => import("date-fns/locale/pl").then((m) => m.pl),
  "pt-BR": () => import("date-fns/locale/pt-BR").then((m) => m.ptBR),
  "pt-PT": () => import("date-fns/locale/pt").then((m) => m.pt),
  ro: () => import("date-fns/locale/ro").then((m) => m.ro),
  ru: () => import("date-fns/locale/ru").then((m) => m.ru),
  th: () => import("date-fns/locale/th").then((m) => m.th),
  tr: () => import("date-fns/locale/tr").then((m) => m.tr),
  uk: () => import("date-fns/locale/uk").then((m) => m.uk),
  vi: () => import("date-fns/locale/vi").then((m) => m.vi),
  "zh-CN": () => import("date-fns/locale/zh-CN").then((m) => m.zhCN),
  "zh-TW": () => import("date-fns/locale/zh-TW").then((m) => m.zhTW),
}

export const dateLocaleLanguages: string[] = Object.keys(dateLocaleLoaders)

const loadedDateLocales = new Map<string, Locale>([["en", enUS]])

export const loadDateLocale = async (language: string): Promise<void> => {
  const load = dateLocaleLoaders[language]

  if (!load || loadedDateLocales.has(language)) {
    return
  }

  loadedDateLocales.set(language, await load())
}

/** The loaded locale for `language`, en-US until (or unless) it has one. */
export const getDateLocale = (language: string): Locale =>
  loadedDateLocales.get(language) ?? enUS
