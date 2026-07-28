import { Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { RouteDrawer } from "@components/modals";
import { useNotificationPreferences } from "@hooks/api";

import { StoreNotificationSettingsForm } from "./store-notification-settings-form";

export const Component = () => {
  const { t } = useTranslation();
  const { data: preferences, isPending, isError, error } = useNotificationPreferences();

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("store.notificationSettings.edit.header")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("store.notificationSettings.edit.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {!isPending && preferences && (
        <StoreNotificationSettingsForm preferences={preferences} />
      )}
    </RouteDrawer>
  );
};
