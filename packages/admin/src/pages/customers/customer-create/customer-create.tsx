import { RouteFocusModal } from "../../../components/modals"
import { CreateCustomerForm } from "./components/create-customer-form"
import { useTranslation } from "react-i18next"

export const CustomerCreate = () => {
  const { t } = useTranslation()
  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("customers.create.header")}</span>
      </RouteFocusModal.Title>
      <CreateCustomerForm />
    </RouteFocusModal>
  )
}
