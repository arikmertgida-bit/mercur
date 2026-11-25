import { useState } from "react"
import { MEDUSA_STOREFRONT_URL } from "../../../lib/storefront"
import type { UserType } from "../../../lib/messenger/types"

interface DynamicAvatarProps {
  src?: string | null | undefined
  alt: string
  className?: string
  type?: UserType | "SUPPORT" | string
  isRectangular?: boolean
}

export function DynamicAvatar({
  src,
  alt,
  className = "",
  type = "CUSTOMER",
  isRectangular = false,
}: DynamicAvatarProps) {
  const defaultClasses = isRectangular
    ? "object-contain flex-shrink-0 bg-ui-bg-component"
    : "rounded-full object-cover aspect-square flex-shrink-0 bg-ui-bg-component border border-ui-border-base"
  const finalClassName = className ? `${className} ${defaultClasses}` : defaultClasses

  // Failures are remembered per src: once the avatar query resolves to a new,
  // working URL the component retries it instead of staying on the fallback.
  const [failure, setFailure] = useState<{ src: string | null | undefined; level: number }>({
    src,
    level: 0,
  })
  const failureLevel = failure.src === src ? failure.level : 0
  const hasError = failureLevel >= 1
  const fallbackFailed = failureLevel >= 2

  const baseUrl = MEDUSA_STOREFRONT_URL.replace(/\/$/, "")

  let fallbackSrc = `${baseUrl}/images/customer-default-avatar.jpg`
  if (type === "ADMIN" || type === "SUPPORT") {
    fallbackSrc = fallbackFailed ? `${baseUrl}/images/customer-default-avatar.jpg` : `${baseUrl}/messenger-logo.png`
  } else if (type === "SELLER" || type === "VENDOR") {
    fallbackSrc = `${baseUrl}/images/vendor/default-seller-avatar.jpeg`
  }

  const isInvalidSrc = !src || src === "null" || src === "undefined" || hasError
  const currentSrc = isInvalidSrc ? fallbackSrc : src

  const handleError = (): void => {
    if (failureLevel < 2) {
      setFailure({ src, level: failureLevel + 1 })
    }
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={finalClassName}
      onError={handleError}
    />
  )
}
