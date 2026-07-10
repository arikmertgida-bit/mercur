import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Heading } from "@medusajs/ui"

import { RouteDrawer } from "@mercurjs/dashboard-shared"
import { UploadImport } from "./components/upload-import"
import { ImportSummary } from "./components/import-summary"

export default function ProductImportPage() {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<{ created: number } | null>(null)

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("productImportExport.importHeader")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description>
          {t("productImportExport.importDescription")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <RouteDrawer.Body>
        {summary ? (
          <ImportSummary created={summary.created} />
        ) : (
          <UploadImport onSuccess={setSummary} />
        )}
      </RouteDrawer.Body>
      <RouteDrawer.Footer>
        <RouteDrawer.Close asChild>
          <Button variant="secondary">
            {summary ? t("productImportExport.done") : t("actions.cancel")}
          </Button>
        </RouteDrawer.Close>
      </RouteDrawer.Footer>
    </RouteDrawer>
  )
}
