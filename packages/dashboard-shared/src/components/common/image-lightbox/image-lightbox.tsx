import { ArrowLeft, ArrowRight, XMark } from "@medusajs/icons"
import { clx, IconButton, Text } from "@medusajs/ui"
import { Dialog as RadixDialog } from "radix-ui"
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"

/** Horizontal movement (px) before a pointer-down is treated as a drag instead of a tap. */
const DRAG_ACTIVATION_THRESHOLD = 8
/** Horizontal movement (px) required on release to advance to the next/previous image. */
const DRAG_COMMIT_THRESHOLD = 60

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
 * Panel-styled image viewer (a Medusa UI card, not a full-bleed slider) with
 * previous/next navigation, a slide counter, a click-through thumbnail strip,
 * and click-outside-to-close — used wherever review photos need to open
 * inside the panel instead of a new browser tab. The image area has a fixed
 * viewport-relative size so opening the dialog never reflows as an image
 * loads or as the active index changes (avoids layout shift).
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

  const [dragX, setDragX] = useState(0)
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    captured: boolean
  } | null>(null)

  const resetDrag = (): void => {
    dragStateRef.current = null
    setDragX(0)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (images.length <= 1 || event.button !== 0) return
    dragStateRef.current = { pointerId: event.pointerId, startX: event.clientX, captured: false }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const delta = event.clientX - drag.startX
    if (!drag.captured) {
      if (Math.abs(delta) < DRAG_ACTIVATION_THRESHOLD) return
      drag.captured = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setDragX(delta)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (drag.captured) {
      event.currentTarget.releasePointerCapture(event.pointerId)
      if (Math.abs(dragX) > DRAG_COMMIT_THRESHOLD) goTo(dragX > 0 ? -1 : 1)
    }
    resetDrag()
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 outline-none"
          onClick={(): void => onIndexChange(null)}
        >
          <RadixDialog.Title className="sr-only">
            {current?.alt || "Image"}
          </RadixDialog.Title>
          <RadixDialog.Description className="sr-only" />

          <div
            className={clx(
              "bg-ui-bg-base shadow-elevation-modal flex w-full max-w-[420px] flex-col overflow-hidden rounded-lg border outline-none sm:max-w-[840px]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-150"
            )}
            onClick={(event): void => event.stopPropagation()}
          >
            <div className="border-ui-border-base flex items-center justify-between gap-x-4 border-b px-4 py-2">
              {images.length > 1 && activeIndex !== null ? (
                <Text size="small" leading="compact" className="text-ui-fg-subtle">
                  {activeIndex + 1} / {images.length}
                </Text>
              ) : (
                <span />
              )}
              <RadixDialog.Close asChild>
                <IconButton variant="transparent" size="small" type="button">
                  <XMark />
                </IconButton>
              </RadixDialog.Close>
            </div>

            <div
              className={clx(
                "bg-ui-bg-subtle relative flex h-[min(50vh,360px)] touch-pan-y items-center justify-center overflow-hidden select-none",
                images.length > 1 && (dragStateRef.current?.captured ? "cursor-grabbing" : "cursor-grab")
              )}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={resetDrag}
            >
              {current && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.url}
                  alt={current.alt || ""}
                  draggable={false}
                  className="max-h-full max-w-full object-contain"
                  style={{
                    transform: dragX !== 0 ? `translateX(${dragX}px)` : undefined,
                    transition: dragStateRef.current?.captured ? "none" : "transform 150ms ease",
                  }}
                />
              )}

              {images.length > 1 && (
                <>
                  <IconButton
                    variant="transparent"
                    size="small"
                    className="bg-ui-bg-base/80 hover:bg-ui-bg-base absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={(event): void => {
                      event.stopPropagation()
                      goTo(-1)
                    }}
                  >
                    <ArrowLeft />
                  </IconButton>
                  <IconButton
                    variant="transparent"
                    size="small"
                    className="bg-ui-bg-base/80 hover:bg-ui-bg-base absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={(event): void => {
                      event.stopPropagation()
                      goTo(1)
                    }}
                  >
                    <ArrowRight />
                  </IconButton>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="border-ui-border-base flex gap-2 overflow-x-auto border-t px-3 py-2">
                {images.map((image, imageIndex) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={(): void => onIndexChange(imageIndex)}
                    className={clx(
                      "size-12 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                      imageIndex === activeIndex
                        ? "border-ui-fg-interactive"
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
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
