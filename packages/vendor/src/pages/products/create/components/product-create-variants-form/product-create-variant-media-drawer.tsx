import { useEffect, useState } from "react"
import { Button, Checkbox, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { Thumbnail } from "@components/common/thumbnail"
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
          className="flex flex-col gap-y-2 overflow-y-auto"
          data-testid="product-create-variant-media-drawer-body"
        >
          {productMedia.length === 0 ? (
            <Text size="small" className="text-ui-fg-subtle">
              {t("products.create.variants.mediaPicker.empty")}
            </Text>
          ) : (
            productMedia.map((media, index) => {
              const mediaId = media.id
              if (!mediaId) {
                return null
              }

              return (
                <label
                  key={mediaId}
                  className="bg-ui-bg-component shadow-elevation-card-rest flex cursor-pointer items-center gap-x-3 rounded-lg px-3 py-2"
                  data-testid={`product-create-variant-media-option-${index}`}
                >
                  <Checkbox
                    checked={selectedIds.includes(mediaId)}
                    onCheckedChange={(checked) =>
                      toggleSelected(mediaId, !!checked)
                    }
                  />
                  <Thumbnail src={media.url} size="small" />
                  <Text size="small" leading="compact">
                    {media.isThumbnail
                      ? t("products.media.makeThumbnail")
                      : t("products.create.variants.mediaPicker.image", {
                          index: index + 1,
                        })}
                  </Text>
                </label>
              )
            })
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
