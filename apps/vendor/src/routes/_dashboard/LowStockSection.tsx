import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Container, Heading, StatusBadge, Table, Text } from "@medusajs/ui"
import { VendorDashboardData } from "../../hooks/api/dashboard"

export const LowStockSection = ({
  data,
  isLoading,
}: {
  data: VendorDashboardData | undefined
  isLoading: boolean
}) => {
  const { t } = useTranslation()
  const items = data?.low_stock ?? []

  return (
    <Container className="mt-2 divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("dashboard.lowStock.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("dashboard.lowStock.subtitle")}
          </Text>
        </div>
        <Link to="/inventory" className="text-ui-fg-interactive txt-compact-small-plus">
          {t("dashboard.lowStock.viewInventory")}
        </Link>
      </div>
      {isLoading ? (
        <div className="px-6 py-8">
          <div className="bg-ui-bg-component h-24 w-full animate-pulse rounded-lg" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-ui-fg-muted px-6 py-8 text-center">
          {t("dashboard.lowStock.noRecords")}
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("dashboard.lowStock.product")}</Table.HeaderCell>
              <Table.HeaderCell>{t("dashboard.lowStock.sku")}</Table.HeaderCell>
              <Table.HeaderCell>{t("dashboard.lowStock.available")}</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((item) => (
              <Table.Row key={item.inventory_item_id}>
                <Table.Cell>{item.product_title}</Table.Cell>
                <Table.Cell className="text-ui-fg-subtle">{item.sku ?? "—"}</Table.Cell>
                <Table.Cell>
                  <StatusBadge color={item.available_quantity === 0 ? "red" : "orange"}>
                    {item.available_quantity}
                  </StatusBadge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}
