import { useSyncExternalStore } from "react"

type DocumentDirection = "ltr" | "rtl"

const readDocumentDirection = (): DocumentDirection | undefined => {
  const dir = document.documentElement.getAttribute("dir")
  return dir === "ltr" || dir === "rtl" ? dir : undefined
}

const subscribe = (onChange: () => void): (() => void) => {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["dir"],
  })
  return () => observer.disconnect()
}

const getServerSnapshot = (): DocumentDirection | undefined => undefined

/**
 * The current `<html dir>` (ltr/rtl), kept in sync with later changes.
 *
 * Read through `useSyncExternalStore` rather than state + an effect: the i18n
 * setup writes `dir` from a child effect, which runs before an ancestor's
 * effect could attach the observer, so the first switch to RTL was missed.
 */
export const useDocumentDirection = (): DocumentDirection | undefined =>
  useSyncExternalStore(subscribe, readDocumentDirection, getServerSnapshot)
