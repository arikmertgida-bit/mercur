import { Trash } from "@medusajs/icons"
import type { HttpTypes } from "@mercurjs/types"
import { Container, Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { ActionMenu } from "@components/common/action-menu"
import { SectionRow } from "@components/common/section"
import { useDeleteShippingProfileAction } from "../../_common/use-delete-shipping-profile-action"

type ShippingProfileGeneralSectionProps = {
  profile: HttpTypes.VendorShippingProfileResponse["shipping_profile"]
}

export const ShippingProfileGeneralSection = ({
  profile,
}: ShippingProfileGeneralSectionProps) => {
  const { t } = useTranslation()
  const handleDelete = useDeleteShippingProfileAction(
    profile,
    "/settings/locations/shipping-profiles"
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>{profile.name}</Heading>
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
      </div>
      <SectionRow title={t("fields.type")} value={profile.type} />
      {/* The product CSV import names the profile by this id. */}
      <SectionRow title={t("fields.id")} value={profile.id} />
    </Container>
  )
}
