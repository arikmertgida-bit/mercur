import { useEffect, type RefObject } from "react"

const DEFAULT_MAX_HEIGHT_PX = 96

/**
 * Auto-grows a textarea to fit its content. Runs inside a single
 * `useEffect([text])` — the previous pattern scheduled a separate
 * `requestAnimationFrame` on every `onChange`, which raced with scroll
 * effects firing in the same frame and contributed to jank. Relying on
 * React's own render/effect ordering is sufficient.
 */
export function useAutoGrowTextarea(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  text: string,
  maxHeightPx: number = DEFAULT_MAX_HEIGHT_PX
): void {
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, maxHeightPx)}px`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, maxHeightPx])
}
