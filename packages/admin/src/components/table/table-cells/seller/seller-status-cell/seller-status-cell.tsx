import { useTranslation } from "react-i18next"

import { ComponentProps } from "react"

import { StatusCell } from "../../common/status-cell"
import { SellerStatus } from "@mercurjs/types"

import { parseSellerStatus } from "../../../../../lib/seller-status"

type SellerStatusCellProps = {
  status: string
}

export const SellerStatusCell = ({ status }: SellerStatusCellProps) => {
  const { t } = useTranslation()

  const statuses: Record<
    SellerStatus,
    [ComponentProps<typeof StatusCell>["color"], string]
  > = {
    [SellerStatus.OPEN]: ["green", t("stores.status.open")],
    [SellerStatus.PENDING_APPROVAL]: ["orange", t("stores.status.pendingApproval")],
    [SellerStatus.SUSPENDED]: ["red", t("stores.status.suspended")],
    [SellerStatus.TERMINATED]: ["grey", t("stores.status.terminated")],
  }
  // Only known statuses get a coloured, translated badge.
  const knownStatus = parseSellerStatus(status)

  if (!knownStatus) {
    return <StatusCell color="grey">{status}</StatusCell>
  }

  const [color, text] = statuses[knownStatus]

  return <StatusCell color={color}>{text}</StatusCell>
}
