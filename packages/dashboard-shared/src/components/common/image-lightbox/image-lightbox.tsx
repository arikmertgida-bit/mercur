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
 * Full-screen in-app image viewer with previous/next navigation, a close
 * button, and click-outside-to-close — used wherever review photos need to
 * open inside the panel instead of a new browser tab.
 */
export const ImageLightbox = ({
  images,
  index,
  onIndexChange,
}: ImageLightboxProps) => {
  const open = index !== null && images.length > 0
  const current = open ? images[((index as number) + images.length) % images.length] : null

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
            "fixed inset-0 z-[100] bg-black/80",
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
              className="text-ui-fg-on-color hover:bg-white/10 fixed right-4 top-4 z-[101]"
              onClick={(event): void => event.stopPropagation()}
            >
              <XMark />
            </IconButton>
          </RadixDialog.Close>

          {images.length > 1 && (
            <IconButton
              variant="transparent"
              size="large"
              className="text-ui-fg-on-color hover:bg-white/10 fixed left-4 top-1/2 z-[101] -translate-y-1/2"
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
              className="max-h-[85vh] max-w-[85vw] rounded-md object-contain"
              onClick={(event): void => event.stopPropagation()}
            />
          )}

          {images.length > 1 && (
            <IconButton
              variant="transparent"
              size="large"
              className="text-ui-fg-on-color hover:bg-white/10 fixed right-4 top-1/2 z-[101] -translate-y-1/2"
              onClick={(event): void => {
                event.stopPropagation()
                goTo(1)
              }}
            >
              <ArrowRight />
            </IconButton>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
