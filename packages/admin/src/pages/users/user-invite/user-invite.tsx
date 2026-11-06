import { RouteFocusModal } from "../../../components/modals"
import { InviteUserForm } from "./components/invite-user-form/invite-user-form"
import { useTranslation } from "react-i18next"

export const UserInvite = () => {
  const { t } = useTranslation()
  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("users.inviteUser")}</span>
      </RouteFocusModal.Title>
      <InviteUserForm />
    </RouteFocusModal>
  )
}
