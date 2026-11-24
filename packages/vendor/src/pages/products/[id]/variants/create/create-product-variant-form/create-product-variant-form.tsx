import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Heading, Input, Label, Text, toast } from "@medusajs/ui"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import type { ProductDTO } from "@mercurjs/types"
import { AttributeType } from "@mercurjs/types/product"
import { MercurFeatureFlags } from "@mercurjs/types/feature-flags"

import { Form } from "@components/common/form"
import { AttributeValueInput } from "@components/inputs/attribute-value-input"
import { LocaleCurrencyInput } from "@components/inputs/locale-currency-input"
import { RouteFocusModal, useRouteModal } from "@components/modals"
import { KeyboundForm } from "@components/utilities/keybound-form"
import { useCurrentSeller, useFeatureFlags } from "@hooks/api"
import { useCreateProductVariant } from "@hooks/api/products"
import { getCurrencySymbol } from "@lib/data/currencies"
import { generateVariantSku } from "@lib/generate-sku"
import { sanitizeNumberInput } from "@lib/sanitize-number-input"
import { CreateProductVariantSchema, toVariantStockPayload } from "./constants"

export type CreateProductVariantSchemaType = z.input<
  typeof CreateProductVariantSchema
>

type VariantStockLocation = { id: string; name: string }

type CreateProductVariantFormProps = {
  product: ProductDTO
  currencies: string[]
  stockLocations: VariantStockLocation[]
}

const toBlankRecord = (keys: string[]): Record<string, string> =>
  Object.fromEntries(keys.map((key) => [key, ""]))

export const CreateProductVariantForm = ({
  product,
  currencies,
  stockLocations,
}: CreateProductVariantFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const { seller } = useCurrentSeller()

  const { feature_flags } = useFeatureFlags()
  const isProductRequestEnabled =
    !!feature_flags?.[MercurFeatureFlags.PRODUCT_REQUEST]

  const variantAttributes =
    product.attributes?.filter((a) => a.is_variant_axis) ?? []

  // Seed every variant-axis option with an empty value so the required
  // validation fires for untouched selects (an empty record would pass).
  const defaultOptions = variantAttributes.reduce<Record<string, string>>(
    (acc, attribute) => {
      acc[attribute.handle ?? attribute.id] = ""
      return acc
    },
    {}
  )

  const form = useForm<CreateProductVariantSchemaType>({
    defaultValues: {
      title: "",
      sku: "",
      options: defaultOptions,
      prices: toBlankRecord(currencies),
      inventory: toBlankRecord(stockLocations.map((location) => location.id)),
    },
    resolver: zodResolver(CreateProductVariantSchema),
  })

  // SKU is store-only and read-only for sellers (see the disabled input
  // below) — fill it in as soon as the seller loads, mirroring
  // products/create's generateVariantSku so every seller-minted SKU across
  // the platform follows the same convention.
  useEffect(() => {
    if (!seller || form.getValues("sku")) return

    form.setValue("sku", generateVariantSku(seller), { shouldDirty: false })
  }, [seller, form])

  const { mutateAsync, isPending } = useCreateProductVariant(product.id)

  const handleSubmit = form.handleSubmit(async (data) => {
    const { title, sku, options } = data
    const { prices, inventory } = toVariantStockPayload({
      prices: data.prices ?? {},
      inventory: data.inventory ?? {},
    })

    // Form keys variant fields by `handle ?? id`; backend keys options
    // by option title (= attribute name). Remap before submitting.
    const cleanedOptions = variantAttributes.reduce<Record<string, string>>(
      (acc, attr) => {
        const fieldKey = attr.handle ?? attr.id
        const v = options?.[fieldKey]
        if (v && attr.name) acc[attr.name] = v
        return acc
      },
      {}
    )

    await mutateAsync(
      {
        title,
        sku: sku || undefined,
        options: Object.keys(cleanedOptions).length
          ? cleanedOptions
          : undefined,
        prices,
        inventory,
      },
      {
        onSuccess: () => {
          handleSuccess()
          toast.success(
            isProductRequestEnabled
              ? t("products.edit.requestSuccessToast")
              : t("products.variant.create.successToast")
          )
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  })

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <RouteFocusModal.Header>
          <RouteFocusModal.Title asChild>
            <span className="sr-only">
              {t("products.variant.create.header")}
            </span>
          </RouteFocusModal.Title>
          <RouteFocusModal.Description className="sr-only">
            {t("products.variant.create.header")}
          </RouteFocusModal.Description>
        </RouteFocusModal.Header>

        <RouteFocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
          <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-8 py-16">
            <Heading level="h1">{t("products.variant.create.header")}</Heading>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Form.Field
                control={form.control}
                name="title"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.title")}</Form.Label>
                      <Form.Control>
                        <Input
                          {...field}
                          data-testid="create-variant-title-input"
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />

              <Form.Field
                control={form.control}
                name="sku"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label optional>{t("fields.sku")}</Form.Label>
                      <Form.Control>
                        <Input
                          {...field}
                          disabled
                          data-testid="create-variant-sku-input"
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />

              {variantAttributes.map((attribute) => {
                const fieldKey = attribute.handle ?? attribute.id
                return (
                  <Form.Field
                    key={attribute.id}
                    control={form.control}
                    name={`options.${fieldKey}`}
                    render={({ field: { value, onChange } }) => {
                      return (
                        <Form.Item>
                          <Form.Label>{attribute.name}</Form.Label>
                          <Form.Control>
                            <AttributeValueInput
                              type={AttributeType.SINGLE_SELECT}
                              value={typeof value === "string" ? value : ""}
                              onChange={onChange}
                              availableValues={(attribute.values ?? []).map(
                                (v) => ({
                                  id: v.id,
                                  name: v.name,
                                })
                              )}
                            />
                          </Form.Control>
                          <Form.ErrorMessage />
                        </Form.Item>
                      )
                    }}
                  />
                )
              })}
            </div>

            <div className="flex flex-col gap-y-4">
              <Heading level="h2">{t("fields.price")}</Heading>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {currencies.map((currency) => (
                  <Form.Field
                    key={currency}
                    control={form.control}
                    name={`prices.${currency}`}
                    render={({ field: { value, onChange, ...field } }) => (
                      <Form.Item>
                        <Form.Label>
                          {t("fields.priceTemplate", {
                            regionOrCurrency: currency.toUpperCase(),
                          })}
                        </Form.Label>
                        <Form.Control>
                          <LocaleCurrencyInput
                            {...field}
                            min={0}
                            code={currency}
                            symbol={getCurrencySymbol(currency)}
                            value={value ?? ""}
                            onValueChange={(amount) => onChange(amount ?? "")}
                            data-testid={`create-variant-price-${currency}-input`}
                          />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-y-4">
              <Heading level="h2">{t("fields.inventory")}</Heading>
              {stockLocations.map((location) => (
                <div
                  key={location.id}
                  className="grid grid-cols-1 items-start gap-4 md:grid-cols-2"
                >
                  <div className="flex flex-col gap-y-2">
                    <Label size="small">{t("products.stock.edit.location")}</Label>
                    <Text
                      size="small"
                      leading="compact"
                      className="text-ui-fg-subtle px-2 py-1.5"
                    >
                      {location.name}
                    </Text>
                  </div>
                  <Form.Field
                    control={form.control}
                    name={`inventory.${location.id}`}
                    render={({ field: { value, ...field } }) => (
                      <Form.Item>
                        <Form.Label>{t("products.stock.edit.quantity")}</Form.Label>
                        <Form.Control>
                          <Input
                            {...field}
                            type="number"
                            min={0}
                            value={value ?? ""}
                            onKeyDown={(e) => sanitizeNumberInput(e, [",", "."])}
                            data-testid={`create-variant-stock-${location.id}-input`}
                          />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        </RouteFocusModal.Body>

        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button
              type="submit"
              variant="primary"
              size="small"
              isLoading={isPending}
              data-testid="create-variant-submit-button"
            >
              {t("actions.save")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}
