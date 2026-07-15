import { useEffect, useState } from "react"
import { Button, Checkbox, Heading, Text, clx } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { StackedDrawer, useStackedModal } from "@components/modals"
import { useTabbedForm } from "@components/tabbed-form/tabbed-form"

import { ProductCreateSchemaType } from "../../types"

export const VARIANT_MEDIA_DRAWER_ID = "product-create-variant-media"

type ProductCreateVariantMediaDrawerProps = {
  activeIndex: number | null
}

export const ProductCreateVariantMediaDrawer = ({
  activeIndex,
}: ProductCreateVariantMediaDrawerProps) => {
  const { t } = useTranslation()
  const form = useTabbedForm<ProductCreateSchemaType>()
  const { getIsOpen, setIsOpen } = useStackedModal()

  const open = getIsOpen(VARIANT_MEDIA_DRAWER_ID)
  const productMedia = form.watch("media") ?? []

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!open || activeIndex === null) {
      return
    }

    const current = form.getValues(`variants.${activeIndex}.media`) ?? []
    setSelectedIds(
      current
        .map((media) => media.id)
        .filter((id): id is string => !!id)
    )
  }, [open, activeIndex, form])

  const toggleSelected = (mediaId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, mediaId] : prev.filter((id) => id !== mediaId)
    )
  }

  const handleSave = () => {
    if (activeIndex === null) {
      return
    }

    const selected = productMedia.filter(
      (media) => !!media.id && selectedIds.includes(media.id)
    )

    form.setValue(`variants.${activeIndex}.media`, selected, {
      shouldDirty: true,
      shouldTouch: true,
    })
    setIsOpen(VARIANT_MEDIA_DRAWER_ID, false)
  }

  return (
    <StackedDrawer id={VARIANT_MEDIA_DRAWER_ID}>
      <StackedDrawer.Content>
        <StackedDrawer.Header>
          <StackedDrawer.Title asChild>
            <Heading>{t("products.create.variants.mediaPicker.header")}</Heading>
          </StackedDrawer.Title>
          <StackedDrawer.Description className="sr-only">
            {t("products.create.variants.mediaPicker.description")}
          </StackedDrawer.Description>
        </StackedDrawer.Header>
        <StackedDrawer.Body
          className="overflow-y-auto"
          data-testid="product-create-variant-media-drawer-body"
        >
          {productMedia.length === 0 ? (
            <Text size="small" className="text-ui-fg-subtle">
              {t("products.create.variants.mediaPicker.empty")}
            </Text>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {productMedia.map((media, index) => {
                const mediaId = media.id
                if (!mediaId) {
                  return null
                }

                const checked = selectedIds.includes(mediaId)
                const label = media.isThumbnail
                  ? t("products.media.makeThumbnail")
                  : t("products.create.variants.mediaPicker.image", {
                      index: index + 1,
                    })

                return (
                  <label
                    key={mediaId}
                    className="group flex cursor-pointer flex-col gap-y-2"
                    data-testid={`product-create-variant-media-option-${index}`}
                  >
                    <div
                      className={clx(
                        "shadow-elevation-card-rest hover:shadow-elevation-card-hover bg-ui-bg-subtle-hover relative aspect-square w-full overflow-hidden rounded-lg outline-none",
                        {
                          "shadow-borders-interactive-with-active": checked,
                        }
                      )}
                    >
                      <div
                        className={clx(
                          "transition-fg absolute right-2 top-2 opacity-0",
                          {
                            "group-focus-within:opacity-100 group-hover:opacity-100":
                              !checked,
                            "opacity-100": checked,
                          }
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            toggleSelected(mediaId, !!value)
                          }
                        />
                      </div>
                      <img
                        src={media.url}
                        alt=""
                        className="size-full object-cover object-center"
                      />
                    </div>
                    <Text
                      size="small"
                      leading="compact"
                      className="text-ui-fg-subtle truncate"
                    >
                      {label}
                    </Text>
                  </label>
                )
              })}
            </div>
          )}
        </StackedDrawer.Body>
        <StackedDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <StackedDrawer.Close asChild>
              <Button
                size="small"
                variant="secondary"
                type="button"
                data-testid="product-create-variant-media-drawer-cancel"
              >
                {t("actions.cancel")}
              </Button>
            </StackedDrawer.Close>
            <Button
              size="small"
              type="button"
              onClick={handleSave}
              data-testid="product-create-variant-media-drawer-save"
            >
              {t("actions.save")}
            </Button>
          </div>
        </StackedDrawer.Footer>
      </StackedDrawer.Content>
    </StackedDrawer>
  )
}
