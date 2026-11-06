import { createContext, useContext, useLayoutEffect, useState } from "react"

/**
 * Radix links a dialog to its description through `aria-describedby` and warns
 * when that link points to nothing. A modal keeps the link only while its
 * `Description` is rendered; otherwise the content declares that it has no
 * description (`aria-describedby={undefined}`), as Radix expects.
 */
const DescriptionPresenceContext = createContext<((present: boolean) => void) | null>(null)

export const DialogDescriptionPresenceProvider = DescriptionPresenceContext.Provider

/**
 * Used by a modal's content: returns the setter for the provider and the
 * `aria-describedby` override to spread on the Radix content.
 */
export const useDialogDescriptionPresence = () => {
  const [hasDescription, setHasDescription] = useState(false)

  return {
    setHasDescription,
    describedByProps: hasDescription ? {} : { "aria-describedby": undefined },
  }
}

/**
 * Used by a modal's `Description`: registers it with the surrounding content
 * for as long as it is mounted.
 */
export const useRegisterDialogDescription = () => {
  const setPresent = useContext(DescriptionPresenceContext)

  useLayoutEffect(() => {
    setPresent?.(true)

    return () => setPresent?.(false)
  }, [setPresent])
}
