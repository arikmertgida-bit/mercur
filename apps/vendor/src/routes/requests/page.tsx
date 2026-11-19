import { Navigate } from "react-router-dom";
import { usePermissions } from "@mercurjs/dashboard-shared";
import i18n from "i18next";
import type { Permission, RouteConfig } from "@mercurjs/dashboard-sdk";
import { RequestsIcon } from "./components/RequestsIcon";

export const config: RouteConfig = {
  label: "domain",
  translationNs: "requests",
  icon: RequestsIcon,
  permissions: ["product_categories:view", "product_collections:view", "product_types:view", "product_tags:view", "return_reasons:view", "reviews:view"],
};

export const handle = {
  breadcrumb: () => i18n.t("requests.domain"),
};

// The menu shows Requests when any tab is allowed, so land on the first allowed one.
const REQUEST_TABS: ReadonlyArray<readonly [string, Permission]> = [
  ["/requests/categories", "product_categories:view"],
  ["/requests/collections", "product_collections:view"],
  ["/requests/types", "product_types:view"],
  ["/requests/tags", "product_tags:view"],
  ["/requests/return-reasons", "return_reasons:view"],
  ["/requests/reviews", "reviews:view"],
];

const RequestsPage = () => {
  const { hasPermission } = usePermissions();
  const tab = REQUEST_TABS.find(([, permission]) => hasPermission(permission));

  return <Navigate to={tab ? tab[0] : REQUEST_TABS[0][0]} replace />;
};

export default RequestsPage;
