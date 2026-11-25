import type { ReactNode } from "react"

import { splitNotificationContent } from "../../lib/messenger/notification-segments"

type NotificationMessageContentProps = {
  content: string
  linkLabel: string
}

export const NotificationMessageContent = ({
  content,
  linkLabel,
}: NotificationMessageContentProps): ReactNode =>
  splitNotificationContent(content).map((segment) => (
    <span key={segment.key}>
      {segment.text}
      {segment.url && (
        <a
          href={segment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-ui-fg-interactive hover:opacity-80"
          onClick={(e) => e.stopPropagation()}
        >
          {linkLabel}
        </a>
      )}
    </span>
  ))
