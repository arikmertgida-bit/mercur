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

  const [hasError, setHasError] = useState<boolean>(false)
  const [fallbackFailed, setFallbackFailed] = useState<boolean>(false)

  const baseUrl = MEDUSA_STOREFRONT_URL.replace(/\/$/, "")

  let fallbackSrc = `${baseUrl}/images/customer-default-avatar.jpg`
  if (type === "ADMIN" || type === "SUPPORT") {
    fallbackSrc = fallbackFailed ? `${baseUrl}/images/customer-default-avatar.jpg` : `${baseUrl}/messenger-logo.png`
  } else if (type === "SELLER" || type === "VENDOR") {
    fallbackSrc = `${baseUrl}/images/vendor/default-seller-avatar.png`
  }

  const isInvalidSrc = !src || src === "null" || src === "undefined" || hasError
  const currentSrc = isInvalidSrc ? fallbackSrc : src

  const handleError = (): void => {
    if (!hasError) {
      setHasError(true)
    } else if (!fallbackFailed) {
      setFallbackFailed(true)
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
