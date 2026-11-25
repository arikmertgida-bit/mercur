type TranslationTree = { [key: string]: string | TranslationTree }

/**
 * One loader per language: the dashboard SDK hands these to the panel's
 * translation backend, which downloads only the active language's file (and
 * the fallback's) instead of all of them on first load.
 */
const appTranslationLoaders: Record<
  string,
  () => Promise<{ default: TranslationTree }>
> = {
  ar: () => import("./ar.json"),
  bg: () => import("./bg.json"),
  bs: () => import("./bs.json"),
  cs: () => import("./cs.json"),
  de: () => import("./de.json"),
  el: () => import("./el.json"),
  en: () => import("./en.json"),
  es: () => import("./es.json"),
  fa: () => import("./fa.json"),
  fr: () => import("./fr.json"),
  he: () => import("./he.json"),
  hu: () => import("./hu.json"),
  id: () => import("./id.json"),
  it: () => import("./it.json"),
  ja: () => import("./ja.json"),
  ko: () => import("./ko.json"),
  lt: () => import("./lt.json"),
  mk: () => import("./mk.json"),
  mn: () => import("./mn.json"),
  nl: () => import("./nl.json"),
  pl: () => import("./pl.json"),
  "pt-BR": () => import("./ptBR.json"),
  "pt-PT": () => import("./ptPT.json"),
  ro: () => import("./ro.json"),
  ru: () => import("./ru.json"),
  th: () => import("./th.json"),
  tr: () => import("./tr.json"),
  uk: () => import("./uk.json"),
  vi: () => import("./vi.json"),
  "zh-CN": () => import("./zhCN.json"),
  "zh-TW": () => import("./zhTW.json"),
}

export default appTranslationLoaders
