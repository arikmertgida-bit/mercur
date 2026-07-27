import { useEffect, type RefObject } from "react"

const DEFAULT_MAX_HEIGHT_PX = 96

/**
 * Textarea'yı içeriğe göre otomatik büyütür. Tek bir `useEffect([text])`
 * içinde çalışır — önceki desende her `onChange`'de ayrı bir
 * `requestAnimationFrame` planlanıyordu; bu, aynı frame'de tetiklenen
 * scroll efektleriyle yarışıp jank'a katkıda bulunuyordu. React'in kendi
 * render/effect sıralamasına güvenmek yeterli.
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
