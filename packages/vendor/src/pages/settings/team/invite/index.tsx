import { RouteFocusModal } from "@components/modals";
import { InviteUserForm } from "./_components/invite-user-form";
import { useTranslation } from "react-i18next";

export const TeamInvite = () => {
  const { t } = useTranslation();
  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("users.inviteUser")}</span>
      </RouteFocusModal.Title>
      <InviteUserForm />
    </RouteFocusModal>
  );
};
