import { ClientError, InferClientOutput } from "@mercurjs/client"
import { MercurFeatureFlags } from "@mercurjs/types"
import { HttpTypes } from "@medusajs/types"
import { Button, toast } from "@medusajs/ui"
import { TFunction } from "i18next"
import { ReactNode, useEffect, useMemo, Children } from "react"
import { useForm, useWatch, DeepPartial } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { RouteFocusModal, useRouteModal } from "@components/modals"
import { TabbedForm } from "@components/tabbed-form/tabbed-form"
import {
  useCreateProduct,
  useFeatureFlags,
  useIsSellerActive,
  useRegions,
} from "@hooks/api"
import { sdk } from "@lib/client"
import { sellerSuspensionBridge } from "@lib/seller-suspension-bridge"

import { PRODUCT_CREATE_FORM_DEFAULTS, ProductCreateSchema } from "../../constants"
import { ProductCreateSchemaType } from "../../types"
import {
  buildVariantMediaUpdates,
  generateVariantsFromAttributes,
  normalizeProductFormValues,
  VariantMediaUpdate,
} from "../../utils"
import { ProductCreateAttributesForm } from "../product-create-attributes-form"
import { ProductCreateDetailsForm } from "../product-create-details-form"
import { ProductCreateOrganizeForm } from "../product-create-organize-form"
import { ProductCreateVariantsForm } from "../product-create-variants-form"

type ProductCreateFormProps = {
  children?: ReactNode
  schema?: z.ZodType<ProductCreateSchemaType>
  defaultValues?: DeepPartial<ProductCreateSchemaType>
}

type UploadedFile = { id?: string; url: string }
type UploadedMediaEntry = UploadedFile & {
  isThumbnail: boolean
  // The local, pre-upload `media[].id` this file came from — carried
  // through so the post-create variant-image follow-up (see
  // `applyVariantMediaUpdates` below) can resolve a seller's Görsel
  // selections (still keyed by that local id) to the just-uploaded URL.
  clientMediaId?: string
}

/**
 * Fires the per-variant `thumbnail`/`images.add` follow-up calls (see
 * `VendorUpdateProductVariant` — `packages/core/src/api/vendor/products/validators.ts`)
 * once the product and its real variant/image ids exist. Runs after the
 * product is already created and the seller already navigated away, so a
 * failed variant here never blocks or reverts the product itself — it only
 * surfaces as a toast naming the affected variants.
 */
const applyVariantMediaUpdates = async (
  productId: string,
  updates: VariantMediaUpdate[],
  t: TFunction
): Promise<void> => {
  if (updates.length === 0) {
    return
  }

  const results = await Promise.allSettled(
    updates.map((update) =>
      sdk.vendor.products.$id.variants.$variantId.mutate({
        $id: productId,
        $variantId: update.variantId,
        thumbnail: update.thumbnail,
        images: update.imageIds.length ? { add: update.imageIds } : undefined,
      })
    )
  )

  const failedVariantTitles = results
    .map((result, index) => ({ result, update: updates[index] }))
    .filter(({ result }) => result.status === "rejected")
    .map(({ update }) => update.variantTitle)

  if (failedVariantTitles.length > 0) {
    toast.warning(
      t("products.create.variants.mediaPicker.partialFailureToast", {
        variants: failedVariantTitles.join(", "),
      })
    )
  }
}

export const ProductCreateForm = ({
  children,
  schema,
  defaultValues: extraDefaults,
}: ProductCreateFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const form = useForm<ProductCreateSchemaType>({
    defaultValues: {
      ...PRODUCT_CREATE_FORM_DEFAULTS,
      ...extraDefaults,
    } as ProductCreateSchemaType,
    resolver: zodResolver(schema ?? ProductCreateSchema),
  })

  const { mutateAsync, isPending } = useCreateProduct()

  // Every region's currency, not just the seller's own onboarding currency —
  // mirrors `@mercurjs/admin`'s product-create-form (`regionsCurrencyMap`) so
  // a seller's variant prices cover every currency the marketplace sells in.
  const { regions } = useRegions({ limit: 9999 })
  const currencies = useMemo(() => {
    return Array.from(
      new Set((regions ?? []).map((region) => region.currency_code))
    )
  }, [regions])

  const { feature_flags } = useFeatureFlags()
  const productRequestEnabled =
    !!feature_flags?.[MercurFeatureFlags.PRODUCT_REQUEST]
  const isSellerActive = useIsSellerActive()

  const watchedAttributes = useWatch({
    control: form.control,
    name: "attributes",
  })

  // Generate variants from variant-axis attributes
  useEffect(() => {
    const currentVariants = form.getValues("variants") ?? []
    const newVariants = generateVariantsFromAttributes(
      watchedAttributes ?? [],
      currentVariants
    )

    if (
      JSON.stringify(newVariants.map((v) => v.options)) !==
      JSON.stringify(currentVariants.map((v) => v.options))
    ) {
      form.setValue("variants", newVariants)
    }
  }, [watchedAttributes, form])

  const submitProduct = async (
    values: ProductCreateSchemaType,
    isDraftSubmission: boolean
  ) => {
    if (!isSellerActive) {
      sellerSuspensionBridge.requestOpen()
      return
    }

    const media = values.media || []
    const payload = { ...values, media: undefined }

    let uploadedMedia: UploadedMediaEntry[] = []
    try {
      const filesToUpload = media
        .map((m) => ({
          file: m.file,
          isThumbnail: m.isThumbnail,
          clientMediaId: m.id,
        }))
        .filter((m) => !!m.file)

      if (filesToUpload.length) {
        const result = await sdk.vendor.uploads.mutate({
          files: filesToUpload.map(({ file }) => file),
        })
        const uploadedFiles: UploadedFile[] = result?.files ?? []
        uploadedMedia = uploadedFiles.map((file, i) => ({
          ...file,
          isThumbnail: filesToUpload[i].isThumbnail,
          clientMediaId: filesToUpload[i].clientMediaId,
        }))
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    }

    const submittedStatus = isDraftSubmission
      ? "draft"
      : productRequestEnabled
        ? "proposed"
        : "published"

    await mutateAsync(
      normalizeProductFormValues(
        {
          ...payload,
          media: uploadedMedia,
          status: submittedStatus as HttpTypes.AdminProductStatus,
        },
        currencies,
      ),
      {
        onSuccess: (data: InferClientOutput<typeof sdk.vendor.products.mutate>) => {
          if (submittedStatus === "proposed") {
            toast.success(t("products.create.requestSuccessToast"))
          } else {
            toast.success(
              t("products.create.successToast", {
                title: data.product.title,
              })
            )
          }

          handleSuccess(`../${data.product.id}`)

          // Görsel seçimleri, product-image ilişkisini yalnızca ürün
          // gerçekten oluştuktan sonra kurabilen ayrı bir uçla (bkz. plan)
          // uygulanır — başarısız olsa bile ürün zaten oluşturuldu, bu
          // yüzden navigasyonu/toast'ı bloklamadan arka planda çalışır.
          try {
            const clientMediaIdToUrl = new Map(
              uploadedMedia
                .filter(
                  (m): m is UploadedMediaEntry & { clientMediaId: string } =>
                    !!m.clientMediaId
                )
                .map((m) => [m.clientMediaId, m.url])
            )
            const urlToImageId = new Map(
              (data.product.images ?? []).map((image) => [
                image.url,
                image.id,
              ])
            )
            const skuToVariantId = new Map(
              (data.product.variants ?? [])
                .filter(
                  (
                    v
                  ): v is (typeof data.product.variants)[number] & {
                    sku: string
                  } => !!v.sku
                )
                .map((v) => [v.sku, v.id])
            )

            const variantMediaUpdates = buildVariantMediaUpdates(
              values.variants,
              clientMediaIdToUrl,
              urlToImageId,
              skuToVariantId
            )

            void applyVariantMediaUpdates(data.product.id, variantMediaUpdates, t)
          } catch (error) {
            if (error instanceof Error) {
              toast.error(error.message)
            }
          }
        },
        onError: (error: ClientError) => {
          toast.error(error.message)
        },
      }
    )
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    await submitProduct(values, false)
  })

  const handleSaveAsDraft = async () => {
    // Drafts only require a title; bypass the full schema so users can save
    // incomplete products without filling category, attributes, etc.
    const titleValid = await form.trigger("title")
    if (!titleValid) {
      return
    }
    await submitProduct(form.getValues(), true)
  }

  const defaultTabs = useMemo(
    () => [
      <ProductCreateDetailsForm key="details" />,
      <ProductCreateOrganizeForm key="organize" />,
      <ProductCreateAttributesForm key="attributes" />,
      <ProductCreateVariantsForm key="variants" />,
    ],
    []
  )

  const hasCustomChildren = Children.count(children) > 0

  return (
    <TabbedForm
      model="product"
      zone="create"
      form={form}
      onSubmit={handleSubmit}
      isLoading={isPending}
      // oxlint-disable-next-line react/no-unstable-nested-components -- TabbedForm footer render-prop, invoked as a function by TabbedForm, never mounted as JSX
      footer={({ isLastTab, onNext, isLoading }) => (
        <div
          className="flex items-center justify-end gap-x-2"
          data-testid="product-create-form-footer-actions"
        >
          <RouteFocusModal.Close asChild>
            <Button
              variant="secondary"
              size="small"
              data-testid="product-create-form-cancel-button"
            >
              {t("actions.cancel")}
            </Button>
          </RouteFocusModal.Close>
          <Button
            variant="secondary"
            size="small"
            type="button"
            onClick={handleSaveAsDraft}
            isLoading={isLoading}
            className="whitespace-nowrap"
            data-testid="product-create-form-save-draft-button"
          >
            {t("actions.saveAsDraft")}
          </Button>
          {isLastTab ? (
            <Button
              data-name="publish-button"
              key="submit-button"
              type="submit"
              variant="primary"
              size="small"
              isLoading={isLoading}
              data-testid="product-create-form-publish-button"
            >
              {t("actions.publish")}
            </Button>
          ) : (
            <Button
              key="next-button"
              type="button"
              variant="primary"
              size="small"
              onClick={() => onNext()}
              data-testid="product-create-form-continue-button"
            >
              {t("actions.continue")}
            </Button>
          )}
        </div>
      )}
    >
      {hasCustomChildren ? children : defaultTabs}
    </TabbedForm>
  )
}
