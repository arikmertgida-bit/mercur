import { Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { RouteDrawer } from "../../../components/modals";
import { useOrder } from "../../../hooks/api";
import { DEFAULT_FIELDS } from "../order-detail/constants";
import { CreateRefundForm } from "./components/create-refund-form";
import { useRequiredParam } from "@mercurjs/dashboard-shared";

export const OrderCreateRefund = () => {
  const { t } = useTranslation();
  const id = useRequiredParam("id");
  const { order } = useOrder(id, {
    fields: DEFAULT_FIELDS,
  });

  return (
    <RouteDrawer data-testid="order-create-refund-drawer">
      <RouteDrawer.Header data-testid="order-create-refund-header">
        <RouteDrawer.Title asChild>
          <Heading data-testid="order-create-refund-heading">
            {t("orders.payment.createRefund")}
          </Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>

      {order && <CreateRefundForm order={order} />}
    </RouteDrawer>
  );
};
