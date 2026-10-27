import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { RouteDrawer } from "../../../components/modals"
import { useUser } from "../../../hooks/api/users"
import { EditUserForm } from "./components/edit-user-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const UserEdit = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")
  const { user, isPending: isLoading, isError, error } = useUser(id)

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer data-testid="user-edit">
      <RouteDrawer.Header data-testid="user-edit-header">
        <RouteDrawer.Title asChild>
          <Heading data-testid="user-edit-heading">{t("users.editUser")}</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {!isLoading && user && <EditUserForm user={user} />}
    </RouteDrawer>
  )
}
