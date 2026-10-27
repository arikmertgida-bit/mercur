import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { RouteDrawer } from "../../../components/modals"
import { useRefundReason } from "../../../hooks/api/refund-reasons"
import { RefundReasonEditForm } from "./components/refund-reason-edit-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"

export const RefundReasonEdit = () => {
  const id = useRequiredParam("id")
  const { t } = useTranslation()

  const { refund_reason, isPending, isError, error } = useRefundReason(id)

  const ready = !isPending && !!refund_reason

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer data-testid="refund-reason-edit-drawer">
      <RouteDrawer.Header data-testid="refund-reason-edit-drawer-header">
        <RouteDrawer.Title asChild>
          <Heading data-testid="refund-reason-edit-drawer-heading">{t("refundReasons.edit.header")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("refundReasons.edit.subtitle")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {ready && <RefundReasonEditForm refundReason={refund_reason} />}
    </RouteDrawer>
  )
}