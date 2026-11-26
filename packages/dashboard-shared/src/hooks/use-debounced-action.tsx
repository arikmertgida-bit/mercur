import { useCallback, useEffect, useRef } from "react"

export type DebouncedAction = (run: () => void) => void

/**
 * Returns a scheduler that runs only the last action given to it within
 * `delay` ms. Pending actions are dropped on unmount.
 */
export const useDebouncedAction = (delay: number): DebouncedAction => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return useCallback(
    (run: () => void) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null
        run()
      }, delay)
    },
    [delay]
  )
}
