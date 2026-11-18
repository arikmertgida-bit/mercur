import { Navigate } from "react-router-dom";
import i18n from "i18next";
import type { RouteConfig } from "@mercurjs/dashboard-sdk";
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

const RequestsPage = () => {
  return <Navigate to="/requests/categories" replace />;
};

export default RequestsPage;
