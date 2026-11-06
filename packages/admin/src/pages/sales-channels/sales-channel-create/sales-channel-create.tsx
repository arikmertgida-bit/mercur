import { RouteFocusModal } from "../../../components/modals"
import { CreateSalesChannelForm } from "./components/create-sales-channel-form"
import { useTranslation } from "react-i18next"

export const SalesChannelCreate = () => {
  const { t } = useTranslation()
  return (
    <RouteFocusModal data-testid="sales-channel-create-modal">
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("salesChannels.createSalesChannel")}</span>
      </RouteFocusModal.Title>
      <CreateSalesChannelForm />
    </RouteFocusModal>
  )
}
