import { defineWidgetConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export const config = defineWidgetConfig({
  zone: "product.detail.side.before",
})

const ProductDetailInfo = ({ data }: { data?: { title?: string; id?: string } }) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("productDetailInfoWidget.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("productDetailInfoWidget.description", {
            title: data?.title ?? t("productDetailInfoWidget.fallbackTitle"),
            id: data?.id,
          })}
        </Text>
      </div>
    </Container>
  )
}

export default ProductDetailInfo
