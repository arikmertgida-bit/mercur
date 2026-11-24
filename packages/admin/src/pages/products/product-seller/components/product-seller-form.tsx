import { zodResolver } from "@hookform/resolvers/zod"
import { usePermissionGate } from "@mercurjs/dashboard-shared"
import { HttpTypes } from "@mercurjs/types"
import { Alert, Button, Text, toast } from "@medusajs/ui"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { ConditionalTooltip } from "../../../../components/common/conditional-tooltip"
import { Form } from "../../../../components/common/form"
import { Combobox } from "../../../../components/inputs/combobox"
import { RouteDrawer, useRouteModal } from "../../../../components/modals"
import { i18n } from "../../../../components/utilities/i18n/i18n"
import { KeyboundForm } from "../../../../components/utilities/keybound-form"
import { useChangeProductSeller } from "../../../../hooks/api/products"
import { useComboboxData } from "../../../../hooks/use-combobox-data"
import { sdk } from "../../../../lib/client"

type ProductSellerFormProps = {
  product: HttpTypes.AdminProduct
}

const ProductSellerSchema = zod.object({
  seller_id: zod
    .string()
    .min(1, { error: () => i18n.t("products.create.errors.requiredSeller") }),
  shipping_profile_id: zod
    .string()
    .min(1, { error: () => i18n.t("products.shippingProfile.create.errors.required") }),
})

export const ProductSellerForm = ({ product }: ProductSellerFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const sellersGate = usePermissionGate("sellers:view")
  const shippingProfilesGate = usePermissionGate("shipping_profiles:view")

  const currentSeller = product.sellers?.[0]

  const form = useForm({
    defaultValues: { seller_id: "", shipping_profile_id: "" },
    resolver: zodResolver(ProductSellerSchema),
  })

  const sellerId = useWatch({ control: form.control, name: "seller_id" })

  const sellers = useComboboxData({
    queryKey: ["sellers"],
    queryFn: (params) => sdk.admin.sellers.query(params),
    getOptions: (data) =>
      data.sellers
        .filter((seller: { id: string }) => seller.id !== currentSeller?.id)
        .map((seller: { id: string; name: string }) => ({
          label: seller.name,
          value: seller.id,
        })),
    enabled: sellersGate.allowed,
  })

  const shippingProfiles = useComboboxData({
    queryKey: ["shipping_profiles", sellerId],
    queryFn: (params) => {
      // seller_id is a Mercur filter (shipping_profile_seller link) that the
      // Medusa-derived list params type does not declare.
      const filters = { ...params, seller_id: sellerId }
      return sdk.admin.shippingProfiles.query(filters)
    },
    getOptions: (data) =>
      data.shipping_profiles.map((shippingProfile) => ({
        label: shippingProfile.name,
        value: shippingProfile.id,
      })),
    enabled: shippingProfilesGate.allowed && !!sellerId,
  })

  const { mutateAsync, isPending } = useChangeProductSeller(product.id)

  const handleSubmit = form.handleSubmit(async (data) => {
    const sellerName =
      sellers.options.find((option) => option.value === data.seller_id)
        ?.label ?? ""

    await mutateAsync(data, {
      onSuccess: ({ product }) => {
        toast.success(
          t("products.sellerChange.successToast", {
            title: product.title,
            store: sellerName,
          })
        )
        handleSuccess()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  })

  return (
    <RouteDrawer.Form form={form} data-testid="product-seller-form">
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex h-full flex-col"
        data-testid="product-seller-keybound-form"
      >
        <RouteDrawer.Body data-testid="product-seller-form-body">
          <div
            className="flex h-full flex-col gap-y-4"
            data-testid="product-seller-form-fields"
          >
            <div className="flex flex-col gap-y-1">
              <Text size="small" weight="plus" leading="compact">
                {t("products.sellerChange.currentStore")}
              </Text>
              <Text
                size="small"
                className="text-ui-fg-subtle"
                data-testid="product-seller-form-current-store"
              >
                {currentSeller?.name ?? "-"}
              </Text>
            </div>
            <Form.Field
              control={form.control}
              name="seller_id"
              render={({ field: { onChange, ...field } }) => (
                <Form.Item data-testid="product-seller-form-store-item">
                  <Form.Label data-testid="product-seller-form-store-label">
                    {t("products.sellerChange.newStore")}
                  </Form.Label>
                  <ConditionalTooltip
                    showTooltip={sellersGate.denied}
                    content={sellersGate.tooltip}
                  >
                    <div>
                      <Form.Control data-testid="product-seller-form-store-control">
                        <Combobox
                          {...field}
                          onChange={(value) => {
                            onChange(value)
                            form.setValue("shipping_profile_id", "")
                          }}
                          disabled={sellersGate.denied}
                          options={sellers.options}
                          searchValue={sellers.searchValue}
                          onSearchValueChange={sellers.onSearchValueChange}
                          fetchNextPage={sellers.fetchNextPage}
                          data-testid="product-seller-form-store-combobox"
                        />
                      </Form.Control>
                    </div>
                  </ConditionalTooltip>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="shipping_profile_id"
              render={({ field }) => (
                <Form.Item data-testid="product-seller-form-shipping-profile-item">
                  <Form.Label data-testid="product-seller-form-shipping-profile-label">
                    {t("products.fields.shipping_profile.label")}
                  </Form.Label>
                  <Form.Control data-testid="product-seller-form-shipping-profile-control">
                    <Combobox
                      {...field}
                      disabled={!sellerId || shippingProfilesGate.denied}
                      options={shippingProfiles.options}
                      searchValue={shippingProfiles.searchValue}
                      onSearchValueChange={shippingProfiles.onSearchValueChange}
                      fetchNextPage={shippingProfiles.fetchNextPage}
                      data-testid="product-seller-form-shipping-profile-combobox"
                    />
                  </Form.Control>
                  <Form.Hint>
                    {sellerId
                      ? t("products.sellerChange.shippingProfileHint")
                      : t("products.sellerChange.selectStoreFirst")}
                  </Form.Hint>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Alert variant="warning" data-testid="product-seller-form-stock-warning">
              {t("products.sellerChange.stockWarning")}
            </Alert>
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer data-testid="product-seller-form-footer">
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button
                size="small"
                variant="secondary"
                data-testid="product-seller-form-cancel-button"
              >
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button
              size="small"
              type="submit"
              isLoading={isPending}
              data-testid="product-seller-form-save-button"
            >
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
