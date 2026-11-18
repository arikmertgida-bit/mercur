import type { HttpTypes } from "@mercurjs/types"
import { toast, usePrompt } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { useDeleteShippingProfile } from "@hooks/api/shipping-profiles"

type ShippingProfile = HttpTypes.VendorShippingProfileResponse["shipping_profile"]

export const useDeleteShippingProfileAction = (
  profile: ShippingProfile,
  redirectTo?: string
): (() => Promise<void>) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const navigate = useNavigate()

  const { mutateAsync } = useDeleteShippingProfile(profile.id)

  return async () => {
    const confirmed = await prompt({
      title: t("shippingProfile.delete.title"),
      description: t("shippingProfile.delete.description", {
        name: profile.name,
      }),
      verificationText: profile.name,
      verificationInstruction: t("general.typeToConfirm"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!confirmed) {
      return
    }

    await mutateAsync(undefined, {
      onSuccess: () => {
        toast.success(
          t("shippingProfile.delete.successToast", { name: profile.name })
        )

        if (redirectTo) {
          navigate(redirectTo, { replace: true })
        }
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }
}
