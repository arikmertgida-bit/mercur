import { ArrowLeft, ArrowRight, XMark } from "@medusajs/icons"
import { clx, IconButton } from "@medusajs/ui"
import { Dialog as RadixDialog } from "radix-ui"
import { useEffect } from "react"

export type ImageLightboxImage = {
  id: string
  url: string
  alt?: string
}

type ImageLightboxProps = {
  images: ImageLightboxImage[]
  /** Index of the image currently shown, or null when the lightbox is closed. */
  index: number | null
  onIndexChange: (index: number | null) => void
}

/**
 * Full-screen in-app image viewer with previous/next navigation, a slide
 * counter, a click-through thumbnail strip, and click-outside-to-close —
 * used wherever review photos need to open inside the panel instead of a
 * new browser tab.
 */
export const ImageLightbox = ({
  images,
  index,
  onIndexChange,
}: ImageLightboxProps) => {
  const open = index !== null && images.length > 0
  const activeIndex = open ? ((index as number) + images.length) % images.length : null
  const current = activeIndex !== null ? images[activeIndex] : null

  const goTo = (delta: number): void => {
    if (index === null || images.length === 0) return
    onIndexChange((index + delta + images.length) % images.length)
  }

  useEffect(() => {
    if (!open) return

    const handler = (event: KeyboardEvent): void => {
      if (event.key === "ArrowLeft") goTo(-1)
      if (event.key === "ArrowRight") goTo(1)
    }
    window.addEventListener("keydown", handler)
    return (): void => window.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, images.length])

  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(next): void => {
        if (!next) onIndexChange(null)
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={clx(
            "fixed inset-0 z-[100] bg-ui-bg-overlay",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <RadixDialog.Content
          className="fixed inset-0 z-[100] flex items-center justify-center outline-none"
          onClick={(): void => onIndexChange(null)}
        >
          <RadixDialog.Title className="sr-only">
            {current?.alt || "Image"}
          </RadixDialog.Title>
          <RadixDialog.Description className="sr-only" />

          <RadixDialog.Close asChild>
            <IconButton
              variant="transparent"
              size="large"
              className="text-ui-fg-on-color fixed right-4 top-4 z-[101]"
              onClick={(event): void => event.stopPropagation()}
            >
              <XMark />
            </IconButton>
          </RadixDialog.Close>

          {images.length > 1 && activeIndex !== null && (
            <span className="text-ui-fg-on-color fixed left-1/2 top-4 z-[101] -translate-x-1/2 text-sm font-medium">
              {activeIndex + 1} / {images.length}
            </span>
          )}

          {images.length > 1 && (
            <IconButton
              variant="transparent"
              size="large"
              className="text-ui-fg-on-color fixed left-4 top-1/2 z-[101] -translate-y-1/2"
              onClick={(event): void => {
                event.stopPropagation()
                goTo(-1)
              }}
            >
              <ArrowLeft />
            </IconButton>
          )}

          {current && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.url}
              alt={current.alt || ""}
              className={clx(
                "max-w-[75vw] rounded-md object-contain",
                images.length > 1 ? "max-h-[65vh]" : "max-h-[80vh]"
              )}
              onClick={(event): void => event.stopPropagation()}
            />
          )}

          {images.length > 1 && (
            <IconButton
              variant="transparent"
              size="large"
              className="text-ui-fg-on-color fixed right-4 top-1/2 z-[101] -translate-y-1/2"
              onClick={(event): void => {
                event.stopPropagation()
                goTo(1)
              }}
            >
              <ArrowRight />
            </IconButton>
          )}

          {images.length > 1 && (
            <div
              className="fixed bottom-4 left-1/2 z-[101] flex max-w-[75vw] -translate-x-1/2 gap-2 overflow-x-auto px-2"
              onClick={(event): void => event.stopPropagation()}
            >
              {images.map((image, imageIndex) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={(): void => onIndexChange(imageIndex)}
                  className={clx(
                    "size-14 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                    imageIndex === activeIndex
                      ? "border-ui-fg-on-color"
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.alt || ""}
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
