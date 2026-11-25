import type { TranslationLoaders } from "../types"

/**
 * One loader per panel language. Each file becomes its own chunk, so the
 * panel downloads only the active language (and the fallback) instead of all
 * of them on first load. Loaded by `i18n/backend.ts`.
 */
export const translationLoaders: TranslationLoaders = {
  bs: () => import("./bs.json"),
  bg: () => import("./bg.json"),
  de: () => import("./de.json"),
  el: () => import("./el.json"),
  en: () => import("./en.json"),
  es: () => import("./es.json"),
  fr: () => import("./fr.json"),
  he: () => import("./he.json"),
  hu: () => import("./hu.json"),
  it: () => import("./it.json"),
  ja: () => import("./ja.json"),
  pl: () => import("./pl.json"),
  "pt-BR": () => import("./ptBR.json"),
  "pt-PT": () => import("./ptPT.json"),
  th: () => import("./th.json"),
  tr: () => import("./tr.json"),
  uk: () => import("./uk.json"),
  ro: () => import("./ro.json"),
  mk: () => import("./mk.json"),
  mn: () => import("./mn.json"),
  ar: () => import("./ar.json"),
  "zh-CN": () => import("./zhCN.json"),
  fa: () => import("./fa.json"),
  cs: () => import("./cs.json"),
  ru: () => import("./ru.json"),
  lt: () => import("./lt.json"),
  vi: () => import("./vi.json"),
  ko: () => import("./ko.json"),
  nl: () => import("./nl.json"),
  id: () => import("./id.json"),
  "zh-TW": () => import("./zhTW.json"),
}

export const translationLanguages: string[] = Object.keys(translationLoaders)
