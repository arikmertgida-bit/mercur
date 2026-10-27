import { useTranslation } from "react-i18next"

import { ComponentProps } from "react"

import { StatusCell } from "../../common/status-cell"
import { ProductStatus } from "@mercurjs/types"

type ProductStatusCellProps = {
  status: ProductStatus
}

export const ProductStatusCell = ({ status }: ProductStatusCellProps) => {
  const { t } = useTranslation()

  const statuses: Record<
    ProductStatus,
    [ComponentProps<typeof StatusCell>["color"], string]
  > = {
    [ProductStatus.DRAFT]: ["grey", t("products.productStatus.draft")],
    [ProductStatus.PROPOSED]: ["orange", t("products.productStatus.proposed")],
    [ProductStatus.PUBLISHED]: ["green", t("products.productStatus.published")],
    [ProductStatus.REJECTED]: ["red", t("products.productStatus.rejected")],
  }
  const [color, text] = statuses[status]

  return <StatusCell color={color}>{text}</StatusCell>
}

export const ProductStatusHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center">
      <span>{t("fields.status")}</span>
    </div>
  )
}
