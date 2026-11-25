import { useEffect, type RefObject } from "react"

const DEFAULT_MAX_HEIGHT_PX = 96

/**
 * Auto-grows a textarea to fit its content. Runs inside a single
 * `useEffect([text])` — the previous pattern scheduled a separate
 * `requestAnimationFrame` on every `onChange`, which raced with scroll
 * effects firing in the same frame and contributed to jank. Relying on
 * React's own render/effect ordering is sufficient. An empty textarea (e.g.
 * right after sending) drops the inline height and returns to its CSS size.
 */
export function useAutoGrowTextarea(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  text: string,
  maxHeightPx: number = DEFAULT_MAX_HEIGHT_PX
): void {
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    if (text.length === 0) {
      el.style.height = ""
      return
    }
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, maxHeightPx)}px`
  }, [textareaRef, text, maxHeightPx])
}
