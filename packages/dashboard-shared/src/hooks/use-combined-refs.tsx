import { MutableRefObject, RefCallback } from "react"

/**
 * Any ref React can attach: a callback ref, or an object ref (a `useRef`
 * object or a forwarded ref).
 */
type CombinableRef<T> = RefCallback<T> | MutableRefObject<T | null> | null | undefined

// Utility function to set multiple refs
function setRef<T>(ref: CombinableRef<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value)
  } else if (ref) {
    ref.current = value
  }
}

// Combining multiple refs into one
export const useCombinedRefs = <T,>(
  ...refs: CombinableRef<T>[]
): RefCallback<T> => {
  return (value: T | null) => {
    refs.forEach((ref) => setRef(ref, value))
  }
}
