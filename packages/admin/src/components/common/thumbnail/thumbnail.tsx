import { Photo } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { useState } from "react"

type ThumbnailProps = {
  src?: string | null
  alt?: string
  size?: "small" | "base"
}

export const Thumbnail = ({ src, alt, size = "base" }: ThumbnailProps) => {
  const [erroredSrc, setErroredSrc] = useState<string | null>(null)
  const showImage = !!src && src !== erroredSrc

  return (
    <div
      className={clx(
        "bg-ui-bg-component border-ui-border-base flex items-center justify-center overflow-hidden rounded border",
        {
          "h-8 w-6": size === "base",
          "h-5 w-4": size === "small",
        }
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          onError={() => setErroredSrc(src ?? null)}
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <Photo className="text-ui-fg-subtle" />
      )}
    </div>
  )
}
