import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@medusajs/ui";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { notificationPreferencesBridge } from "@mercurjs/dashboard-shared";

import { SwitchBox } from "@components/common/switch-box";
import { RouteDrawer, useRouteModal } from "@components/modals";
import { KeyboundForm } from "@components/utilities/keybound-form";
import {
  NotificationCategory,
  NotificationCategoryType,
  NotificationPreferenceEntry,
  useUpdateNotificationPreferences,
} from "@hooks/api";

type StoreNotificationSettingsFormProps = {
  preferences: NotificationPreferenceEntry[];
};

const NotificationSettingsSchema = z.object({
  [NotificationCategory.ORDER]: z.boolean(),
  [NotificationCategory.PAYOUT]: z.boolean(),
  [NotificationCategory.REQUEST]: z.boolean(),
  [NotificationCategory.REVIEW]: z.boolean(),
  [NotificationCategory.FOLLOWER]: z.boolean(),
  [NotificationCategory.MESSENGER]: z.boolean(),
});

type NotificationSettingsFormValues = z.infer<typeof NotificationSettingsSchema>;

const CATEGORY_LABEL_KEYS: Record<NotificationCategoryType, string> = {
  [NotificationCategory.ORDER]: "store.notificationSettings.categories.order",
  [NotificationCategory.PAYOUT]: "store.notificationSettings.categories.payout",
  [NotificationCategory.REQUEST]: "store.notificationSettings.categories.request",
  [NotificationCategory.REVIEW]: "store.notificationSettings.categories.review",
  [NotificationCategory.FOLLOWER]: "store.notificationSettings.categories.follower",
  [NotificationCategory.MESSENGER]: "store.notificationSettings.categories.messenger",
};

const CATEGORY_DESCRIPTION_KEYS: Record<NotificationCategoryType, string> = {
  [NotificationCategory.ORDER]: "store.notificationSettings.categories.orderDescription",
  [NotificationCategory.PAYOUT]: "store.notificationSettings.categories.payoutDescription",
  [NotificationCategory.REQUEST]: "store.notificationSettings.categories.requestDescription",
  [NotificationCategory.REVIEW]: "store.notificationSettings.categories.reviewDescription",
  [NotificationCategory.FOLLOWER]: "store.notificationSettings.categories.followerDescription",
  [NotificationCategory.MESSENGER]: "store.notificationSettings.categories.messengerDescription",
};

export const StoreNotificationSettingsForm = ({
  preferences,
}: StoreNotificationSettingsFormProps) => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();

  const byType = new Map(
    preferences.map((preference) => [preference.notificationType, preference.enabled])
  );

  const form = useForm<NotificationSettingsFormValues>({
    defaultValues: {
      [NotificationCategory.ORDER]: byType.get(NotificationCategory.ORDER) ?? true,
      [NotificationCategory.PAYOUT]: byType.get(NotificationCategory.PAYOUT) ?? true,
      [NotificationCategory.REQUEST]: byType.get(NotificationCategory.REQUEST) ?? true,
      [NotificationCategory.REVIEW]: byType.get(NotificationCategory.REVIEW) ?? true,
      [NotificationCategory.FOLLOWER]: byType.get(NotificationCategory.FOLLOWER) ?? true,
      [NotificationCategory.MESSENGER]: byType.get(NotificationCategory.MESSENGER) ?? true,
    },
    resolver: zodResolver(NotificationSettingsSchema),
  });

  const { mutateAsync, isPending } = useUpdateNotificationPreferences();

  const handleSubmit = form.handleSubmit(async (values) => {
    const nextPreferences: NotificationPreferenceEntry[] = (
      Object.keys(values) as NotificationCategoryType[]
    ).map((notificationType) => ({
      notificationType,
      enabled: values[notificationType],
    }));

    await mutateAsync(nextPreferences, {
      onSuccess: () => {
        notificationPreferencesBridge.publishChanged();
        toast.success(t("store.notificationSettings.edit.successToast"));
        handleSuccess();
      },
      onError: (error: Error) => {
        toast.error(error.message);
      },
    });
  });

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <RouteDrawer.Body>
          <div className="flex flex-col gap-y-4">
            {(Object.keys(CATEGORY_LABEL_KEYS) as NotificationCategoryType[]).map(
              (notificationType) => (
                <SwitchBox
                  key={notificationType}
                  control={form.control}
                  name={notificationType}
                  label={t(CATEGORY_LABEL_KEYS[notificationType])}
                  description={t(CATEGORY_DESCRIPTION_KEYS[notificationType])}
                />
              )
            )}
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button type="submit" size="small" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  );
};
