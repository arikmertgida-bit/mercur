import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { RouteDrawer } from "../../../components/modals"
import { useCustomerGroups } from "../../../hooks/api/customer-groups"
import { usePriceList } from "../../../hooks/api/price-lists"
import { getPriceListCustomerGroupIds } from "../common/utils"
import { PriceListConfigurationForm } from "./components/price-list-configuration-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const PriceListConfiguration = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")

  const { price_list, isPending, isError, error } = usePriceList(id)

  const customerGroupIds = getPriceListCustomerGroupIds(price_list?.rules)

  const {
    customer_groups,
    isPending: isCustomerGroupsPending,
    isError: isCustomerGroupsError,
    error: customerGroupsError,
  } = useCustomerGroups(
    {
      id: customerGroupIds,
    },
    { enabled: !!customerGroupIds?.length }
  )

  const initialCustomerGroups =
    customer_groups?.map((group) => ({
      id: group.id,
      name: group.name ?? "",
    })) || []

  const isCustomerGroupsReady = isPending
    ? false
    : !(!!customerGroupIds?.length && isCustomerGroupsPending)

  const ready = !isPending && !!price_list && isCustomerGroupsReady

  if (isError) {
    throw error
  }

  if (isCustomerGroupsError) {
    throw customerGroupsError
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("priceLists.configuration.edit.header")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {ready && (
        <PriceListConfigurationForm
          priceList={price_list}
          customerGroups={initialCustomerGroups}
        />
      )}
    </RouteDrawer>
  )
}
