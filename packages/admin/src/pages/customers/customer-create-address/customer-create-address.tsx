import { RouteFocusModal } from "../../../components/modals"
import { CreateCustomerAddressForm } from "./components/create-customer-address-form"
import { useTranslation } from "react-i18next"

export const CustomerCreateAddress = () => {
  const { t } = useTranslation()
  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("customers.addresses.create.header")}</span>
      </RouteFocusModal.Title>
      <CreateCustomerAddressForm />
    </RouteFocusModal>
  )
}
