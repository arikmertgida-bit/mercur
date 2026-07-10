import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@medusajs/ui"
import { ArrowDownTray, ArrowUpTray } from "@medusajs/icons"
import { ProductListPage } from "@mercurjs/vendor/pages"

export default function ProductsWithImportExport() {
  const { t } = useTranslation()

  return (
    <ProductListPage>
      <ProductListPage.Table>
        <ProductListPage.Header>
          <ProductListPage.HeaderTitle />
          <ProductListPage.HeaderActions>
            <Button size="small" variant="secondary" asChild>
              <Link to="import">
                <ArrowUpTray />
                {t("productImportExport.import")}
              </Link>
            </Button>
            <Button size="small" variant="secondary" asChild>
              <Link to="export">
                <ArrowDownTray />
                {t("productImportExport.export")}
              </Link>
            </Button>
            <ProductListPage.HeaderCreateButton />
          </ProductListPage.HeaderActions>
        </ProductListPage.Header>
        <ProductListPage.DataTable />
      </ProductListPage.Table>
    </ProductListPage>
  )
}
