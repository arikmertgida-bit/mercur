import { Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { SectionNoAccess, isForbidden, useCan, useRequiredParam } from "@mercurjs/dashboard-shared";
import { RouteDrawer } from "@components/modals";
import { useCustomerGroups } from "@hooks/api/customer-groups";
import { usePriceList } from "@hooks/api/price-lists";

import { PriceListCustomerAvailabilityForm } from "./price-list-customer-availability-form";
import { getPriceListCustomerGroupIds } from "../../common/utils";

export const Component = () => {
  const { t } = useTranslation();
  const id = useRequiredParam("id");

  const { price_list, isPending, isError, error } = usePriceList(id);

  const customerGroupIds = getPriceListCustomerGroupIds(price_list?.rules);

  const canViewCustomerGroups = useCan("customer_groups");

  const {
    customer_groups,
    isPending: isCustomerGroupsPending,
    isError: isCustomerGroupsError,
    error: customerGroupsError,
  } = useCustomerGroups(
    {
      id: customerGroupIds,
    },
    { enabled: !!customerGroupIds?.length && canViewCustomerGroups }
  );

  const initialCustomerGroups =
    customer_groups?.map((group) => ({
      id: group.id,
      name: group.name ?? "",
    })) || [];

  const isCustomerGroupsReady = isPending
    ? false
    : !(!!customerGroupIds?.length && isCustomerGroupsPending);

  const isNoAccess =
    (!!customerGroupIds?.length && !canViewCustomerGroups) ||
    isForbidden(customerGroupsError);

  const ready =
    !isPending && !!price_list && isCustomerGroupsReady && !isNoAccess;

  if (isError) {
    throw error;
  }

  if (isCustomerGroupsError && !isNoAccess) {
    throw customerGroupsError;
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("priceLists.customerAvailability.edit.header")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {isNoAccess && <SectionNoAccess />}
      {ready && (
        <PriceListCustomerAvailabilityForm
          priceList={price_list}
          customerGroups={initialCustomerGroups}
        />
      )}
    </RouteDrawer>
  );
};
