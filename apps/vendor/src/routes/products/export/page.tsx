import { useTranslation } from "react-i18next"
import { Button, Heading, Text, toast } from "@medusajs/ui"

import { RouteDrawer, useRouteModal } from "@mercurjs/dashboard-shared"
import { useExportProducts } from "../../../hooks/api/product-import-export"

function ExportProductsContent() {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const { mutateAsync: exportProducts, isPending } = useExportProducts({
    onSuccess: (data) => {
      if (data.url) {
        const a = document.createElement("a")
        a.href = data.url
        a.download = `products-export-${Date.now()}.csv`
        a.click()
      }
      toast.success(t("productImportExport.exportSuccessToast"))
      handleSuccess()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleExport = async () => {
    await exportProducts()
  }

  return (
    <>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("productImportExport.exportHeader")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description>
          {t("productImportExport.exportDescription")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <RouteDrawer.Body>
        <div className="flex flex-col gap-y-4">
          <Text className="text-ui-fg-subtle">
            {t("productImportExport.exportBody")}
          </Text>
        </div>
      </RouteDrawer.Body>
      <RouteDrawer.Footer>
        <RouteDrawer.Close asChild>
          <Button variant="secondary">{t("actions.cancel")}</Button>
        </RouteDrawer.Close>
        <Button onClick={handleExport} isLoading={isPending}>
          {t("productImportExport.export")}
        </Button>
      </RouteDrawer.Footer>
    </>
  )
}

export default function ProductExportPage() {
  return (
    <RouteDrawer>
      <ExportProductsContent />
    </RouteDrawer>
  )
}
