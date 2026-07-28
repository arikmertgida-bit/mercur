import { BellAlert, PencilSquare } from "@medusajs/icons";
import { Container, Heading, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { ActionMenu } from "@components/common/action-menu";
import { IconAvatar } from "@components/common/icon-avatar";
import {
  ALL_NOTIFICATION_CATEGORIES,
  useNotificationPreferences,
} from "@hooks/api";

export const StoreNotificationSettingsSection = () => {
  const { t } = useTranslation();
  const { data: preferences, isPending } = useNotificationPreferences();

  const total = ALL_NOTIFICATION_CATEGORIES.length;
  const enabledCount =
    preferences?.filter((preference) => preference.enabled).length ?? total;

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">
          {t("store.notificationSettings.header")}
        </Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: t("actions.edit"),
                  icon: <PencilSquare />,
                  to: "notification-settings",
                },
              ],
            },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2 px-2 pb-2">
        <div className="px-4 pb-2">
          <div className="flex items-center gap-4">
            <IconAvatar size="large" variant="squared">
              <BellAlert />
            </IconAvatar>
            <div className="flex flex-1 flex-col">
              <Text size="small" leading="compact" weight="plus">
                {t("store.notificationSettings.summaryTitle")}
              </Text>
              <Text
                size="small"
                leading="compact"
                className="text-ui-fg-subtle"
              >
                {isPending
                  ? "-"
                  : t("store.notificationSettings.summary", {
                      enabled: enabledCount,
                      total,
                    })}
              </Text>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};
