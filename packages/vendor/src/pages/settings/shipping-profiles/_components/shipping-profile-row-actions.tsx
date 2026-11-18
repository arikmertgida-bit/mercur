import { Trash } from "@medusajs/icons"
import type { HttpTypes } from "@mercurjs/types"
import { useTranslation } from "react-i18next"

import { ActionMenu } from "@components/common/action-menu"
import { useDeleteShippingProfileAction } from "../_common/use-delete-shipping-profile-action"

export const ShippingProfileRowActions = ({
  profile,
}: {
  profile: HttpTypes.VendorShippingProfileResponse["shipping_profile"]
}) => {
  const { t } = useTranslation()
  const handleDelete = useDeleteShippingProfileAction(profile)

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <Trash />,
              permission: "shipping_profiles:manage",
              label: t("actions.delete"),
              onClick: handleDelete,
            },
          ],
        },
      ]}
    />
  )
}
