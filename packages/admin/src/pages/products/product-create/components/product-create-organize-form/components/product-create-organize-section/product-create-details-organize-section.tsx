import { usePermissionGate } from "@mercurjs/dashboard-shared"
import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { ConditionalTooltip } from "../../../../../../../components/common/conditional-tooltip"
import { Form } from "../../../../../../../components/common/form"
import { SwitchBox } from "../../../../../../../components/common/switch-box"
import { Combobox } from "../../../../../../../components/inputs/combobox"
import { useTabbedForm } from "../../../../../../../components/tabbed-form/tabbed-form"
import { useComboboxData } from "../../../../../../../hooks/use-combobox-data"
import { sdk } from "../../../../../../../lib/client"
import { SingleCategoryCombobox } from "../../../../../common/components/category-combobox"
import { ProductCreateSchemaType } from "../../../../types"

export const ProductCreateOrganizationSection = () => {
  const form = useTabbedForm<ProductCreateSchemaType>()
  const { t } = useTranslation()

  const collectionsGate = usePermissionGate("product_collections:view")
  const typesGate = usePermissionGate("product_types:view")
  const tagsGate = usePermissionGate("product_tags:view")
  const sellersGate = usePermissionGate("sellers:view")

  const collections = useComboboxData({
    queryKey: ["product_collections"],
    queryFn: (params) => sdk.admin.collections.query(params),
    getOptions: (data) =>
      data.collections.map((collection) => ({
        label: collection.title,
        value: collection.id,
      })),
    enabled: collectionsGate.allowed,
  })

  const types = useComboboxData({
    queryKey: ["product_types"],
    queryFn: (params) => sdk.admin.productTypes.query(params),
    getOptions: (data) =>
      data.product_types.map((type) => ({
        label: type.value,
        value: type.id,
      })),
    enabled: typesGate.allowed,
  })

  const tags = useComboboxData({
    queryKey: ["product_tags"],
    queryFn: (params) => sdk.admin.productTags.query(params),
    getOptions: (data) =>
      data.product_tags.map((tag) => ({
        label: tag.value,
        value: tag.id,
      })),
    enabled: tagsGate.allowed,
  })

  const sellers = useComboboxData({
    queryKey: ["sellers"],
    queryFn: (params) => sdk.admin.sellers.query(params),
    getOptions: (data) =>
      data.sellers.map((seller: { id: string; name: string }) => ({
        label: seller.name,
        value: seller.id,
      })),
    enabled: sellersGate.allowed,
  })

  // Shipping profile and stock locations belong to the chosen store, so a
  // new store clears what was picked for the previous one.
  const resetSellerResources = () => {
    form.setValue("shipping_profile_id", "")
    form.setValue(
      "variants",
      form.getValues("variants").map((variant) => ({
        ...variant,
        inventory: {},
      }))
    )
  }

  return (
    <div id="organize" className="flex flex-col gap-y-8" data-testid="product-create-organize-section">
      <Heading data-testid="product-create-organize-section-heading">{t("products.organization.header")}</Heading>
      <Form.Field
        control={form.control}
        name="seller_id"
        render={({ field: { onChange, ...field } }) => {
          return (
            <Form.Item data-testid="product-create-organize-section-store-item">
              <Form.Label data-testid="product-create-organize-section-store-label">
                {t("fields.store")}
              </Form.Label>
              <ConditionalTooltip
                showTooltip={sellersGate.denied}
                content={sellersGate.tooltip}
              >
                <div>
                  <Form.Control data-testid="product-create-organize-section-store-control">
                    <Combobox
                      {...field}
                      onChange={(value) => {
                        onChange(value)
                        resetSellerResources()
                      }}
                      disabled={sellersGate.denied}
                      options={sellers.options}
                      searchValue={sellers.searchValue}
                      onSearchValueChange={sellers.onSearchValueChange}
                      fetchNextPage={sellers.fetchNextPage}
                      data-testid="product-create-organize-section-store-input"
                    />
                  </Form.Control>
                </div>
              </ConditionalTooltip>
              <Form.Hint>{t("products.fields.seller.hint")}</Form.Hint>
              <Form.ErrorMessage />
            </Form.Item>
          )
        }}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="product-create-organize-section-category-collection">
        <Form.Field
          control={form.control}
          name="category_id"
          render={({ field }) => {
            return (
              <Form.Item data-testid="product-create-organize-section-category-item">
                <Form.Label data-testid="product-create-organize-section-category-label">
                  {t("fields.category")}
                </Form.Label>
                <Form.Control data-testid="product-create-organize-section-category-control">
                  <SingleCategoryCombobox
                    {...field}
                    data-testid="product-create-organize-section-category-input"
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
        <Form.Field
          control={form.control}
          name="collection_id"
          render={({ field }) => {
            return (
              <Form.Item data-testid="product-create-organize-section-collection-item">
                <Form.Label optional data-testid="product-create-organize-section-collection-label">
                  {t("products.fields.collection.label")}
                </Form.Label>
                <ConditionalTooltip
                  showTooltip={collectionsGate.denied}
                  content={collectionsGate.tooltip}
                >
                  <div>
                    <Form.Control data-testid="product-create-organize-section-collection-control">
                      <Combobox
                        {...field}
                        disabled={collectionsGate.denied}
                        options={collections.options}
                        searchValue={collections.searchValue}
                        onSearchValueChange={collections.onSearchValueChange}
                        fetchNextPage={collections.fetchNextPage}
                        data-testid="product-create-organize-section-collection-input"
                      />
                    </Form.Control>
                  </div>
                </ConditionalTooltip>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="product-create-organize-section-type-tags">
        <Form.Field
          control={form.control}
          name="type_id"
          render={({ field }) => {
            return (
              <Form.Item data-testid="product-create-organize-section-type-item">
                <Form.Label optional data-testid="product-create-organize-section-type-label">
                  {t("products.fields.type.label")}
                </Form.Label>
                <ConditionalTooltip
                  showTooltip={typesGate.denied}
                  content={typesGate.tooltip}
                >
                  <div>
                    <Form.Control data-testid="product-create-organize-section-type-control">
                      <Combobox
                        {...field}
                        disabled={typesGate.denied}
                        options={types.options}
                        searchValue={types.searchValue}
                        onSearchValueChange={types.onSearchValueChange}
                        fetchNextPage={types.fetchNextPage}
                        data-testid="product-create-organize-section-type-input"
                      />
                    </Form.Control>
                  </div>
                </ConditionalTooltip>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
        <Form.Field
          control={form.control}
          name="tags"
          render={({ field }) => {
            return (
              <Form.Item data-testid="product-create-organize-section-tags-item">
                <Form.Label optional data-testid="product-create-organize-section-tags-label">
                  {t("products.fields.tags.label")}
                </Form.Label>
                <ConditionalTooltip
                  showTooltip={tagsGate.denied}
                  content={tagsGate.tooltip}
                >
                  <div>
                    <Form.Control data-testid="product-create-organize-section-tags-control">
                      <Combobox
                        {...field}
                        disabled={tagsGate.denied}
                        options={tags.options}
                        searchValue={tags.searchValue}
                        onSearchValueChange={tags.onSearchValueChange}
                        fetchNextPage={tags.fetchNextPage}
                        data-testid="product-create-organize-section-tags-input"
                      />
                    </Form.Control>
                  </div>
                </ConditionalTooltip>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
      </div>
      <div className="flex flex-col gap-y-4">
        <SwitchBox
          control={form.control}
          name="discountable"
          label={t("products.fields.discountable.label")}
          description={t("products.fields.discountable.hint")}
          optional
          data-testid="product-create-organize-section-discountable-switch"
        />
      </div>
    </div>
  )
}
