/**
 * Splits a NOTIFICATION message (e.g. a promotion announcement) into text
 * pieces, each followed by the link that comes after it. `key` is the piece's
 * start offset in the message, so React keys stay tied to the text itself.
 */
export type NotificationSegment = {
  key: number
  text: string
  url: string | null
}

const NOTIFICATION_URL_PATTERN = /https?:\/\/[^\s]+/g
const NOTIFICATION_URL_TEST = /https?:\/\//

export const hasNotificationUrl = (content: string): boolean =>
  NOTIFICATION_URL_TEST.test(content)

export const splitNotificationContent = (content: string): NotificationSegment[] => {
  const segments: NotificationSegment[] = []
  let cursor = 0
  for (const match of content.matchAll(NOTIFICATION_URL_PATTERN)) {
    segments.push({ key: cursor, text: content.slice(cursor, match.index), url: match[0] })
    cursor = match.index + match[0].length
  }
  if (cursor < content.length || segments.length === 0) {
    segments.push({ key: cursor, text: content.slice(cursor), url: null })
  }
  return segments
}
