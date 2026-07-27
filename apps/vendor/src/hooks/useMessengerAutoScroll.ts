import { useEffect, useRef, type RefObject } from "react"
import type { Message } from "../lib/messenger/types"

/**
 * "Yakında en alta" kabul edilen mesafe (px). Kullanıcı bunun içindeyse
 * yeni mesaj gelince otomatik en alta kaydırılır; geçmişi okumak için yukarı
 * kaydırmışsa otomatik kaydırma onu rahatsız etmez.
 */
const NEAR_BOTTOM_THRESHOLD_PX = 80

/**
 * Mesaj listesini en alta kaydırır — yalnızca (a) farklı bir konuşma açıldığında
 * (`conversationKey` değiştiğinde, her zaman en alta) veya (b) aynı konuşmada
 * yeni mesaj geldiğinde VE kullanıcı zaten alta yakınken. Kasıtlı olarak
 * `typingUserIds`'a bağlı DEĞİLDİR: karşı tarafın yazmaya başlaması/durması her
 * seferinde yeni bir array referansı üretiyordu ve bu, kullanıcı geçmişi
 * okurken bile zorla en alta kaydırmaya yol açıyordu.
 *
 * `container.scrollTop` doğrudan atanır — `Element.scrollIntoView()` tercih
 * edilmedi çünkü tanımı gereği en yakın scroll edilebilir atayı (CSS
 * containment bozuksa sayfanın kendisini) hedef alabilir; doğrudan atama bu
 * riski tamamen ortadan kaldırır.
 */
export function useMessengerAutoScroll(
  containerRef: RefObject<HTMLElement | null>,
  messages: Message[],
  conversationKey: string | null
): void {
  const previousConversationKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const isNewConversation = conversationKey !== previousConversationKeyRef.current
    previousConversationKeyRef.current = conversationKey

    if (!isNewConversation) {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight
      if (distanceFromBottom > NEAR_BOTTOM_THRESHOLD_PX) return
    }

    const frameId = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
    return () => cancelAnimationFrame(frameId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, conversationKey])
}
