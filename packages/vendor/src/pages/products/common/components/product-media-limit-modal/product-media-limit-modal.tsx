import { Button, clx, Heading, Text } from "@medusajs/ui"
import { Dialog as RadixDialog } from "radix-ui"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import { MAX_PRODUCT_MEDIA_COUNT } from "../../../create/constants"

const AUTO_CLOSE_MS = 10_000

type ProductMediaLimitModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Non-blocking info dialog — auto-dismisses after AUTO_CLOSE_MS, or the
 * seller can close it immediately with the confirm button. Mirrors
 * DataGridKeyboardShortcutModal's raw-RadixDialog shell (no route to open
 * this from, so RouteFocusModal/StackedFocusModal don't apply). Shared by
 * the product-create media tab and the existing-product media edit screen —
 * both cap uploads at the same `MAX_PRODUCT_MEDIA_COUNT`.
 */
export const ProductMediaLimitModal = ({
  open,
  onOpenChange,
}: ProductMediaLimitModalProps) => {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      onOpenChange(false)
    }, AUTO_CLOSE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [open, onOpenChange])

  return (
    // Opens on top of the already-open parent RouteFocusModal — `modal={false}`
    // keeps this dialog from re-locking body scroll on top of the parent's
    // own lock, which is what causes the visible layout jump when a second
    // modal Dialog mounts (see StackedDrawer for the same fix applied to the
    // Variants-tab media picker).
    <RadixDialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={clx(
            "bg-ui-bg-overlay fixed inset-0",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <RadixDialog.Content
          className="bg-ui-bg-subtle shadow-elevation-modal fixed left-[50%] top-[50%] flex w-full max-w-[400px] translate-x-[-50%] translate-y-[-50%] flex-col gap-y-4 rounded-lg p-6 outline-none"
          data-testid="product-media-limit-modal"
          // This dialog opens right after a native file-picker selection
          // resolves; the element that opened it (the dropzone button)
          // typically still has DOM focus at that instant, which lies
          // outside this non-modal dialog's content. Radix's
          // DismissableLayer treats that as an immediate "focus moved
          // outside" event and closes the dialog before it's ever seen —
          // the ~1ms flash the seller reported. The dialog still closes on
          // its own timeout or the confirm button; it just shouldn't close
          // itself because something else already had focus when it opened.
          onFocusOutside={(event) => event.preventDefault()}
        >
          <div className="flex flex-col gap-y-1">
            <RadixDialog.Title asChild>
              <Heading level="h2">
                {t("products.media.limitExceeded.title")}
              </Heading>
            </RadixDialog.Title>
            <RadixDialog.Description asChild>
              <Text size="small" className="text-ui-fg-subtle">
                {t("products.media.limitExceeded.description", {
                  max: MAX_PRODUCT_MEDIA_COUNT,
                })}
              </Text>
            </RadixDialog.Description>
          </div>
          <div className="flex justify-end">
            <RadixDialog.Close asChild>
              <Button
                size="small"
                variant="primary"
                type="button"
                data-testid="product-media-limit-modal-confirm"
              >
                {t("products.media.limitExceeded.confirm")}
              </Button>
            </RadixDialog.Close>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
