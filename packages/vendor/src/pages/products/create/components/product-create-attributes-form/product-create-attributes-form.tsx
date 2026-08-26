import { XMarkMini } from "@medusajs/icons"
import {
  Button,
  Divider,
  Heading,
  IconButton,
  InlineTip,
  Input,
  Label,
  Select,
  Switch,
  Text,
  Textarea,
} from "@medusajs/ui"
import { AttributeType, ProductAttributeDTO } from "@mercurjs/types"
import { useEffect } from "react"
import {
  Controller,
  FieldArrayWithId,
  UseFieldArrayRemove,
  UseFieldArrayReplace,
  useFieldArray,
} from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "@components/common/form"
import { Combobox } from "@components/inputs/combobox"
import { CountrySelect } from "@components/inputs/country-select"
import { StackedFocusModal, useStackedModal } from "@components/modals"
import { useTabbedForm } from "@components/tabbed-form/tabbed-form"
import { defineTabMeta } from "@components/tabbed-form/types"
import { useProductAttributes } from "@hooks/api"

import { ProductCreateSchemaType } from "../../types"
import {
  ADD_ATTRIBUTES_MODAL_ID,
  ProductCreateAddAttributesModal,
} from "./product-create-add-attributes-modal"

const Root = () => {
  const { t } = useTranslation()
  const form = useTabbedForm<ProductCreateSchemaType>()
  const { setIsOpen } = useStackedModal()

  const { fields, remove, replace } = useFieldArray({
    control: form.control,
    name: "attributes",
  })

  const handleAddExisting = () => {
    setIsOpen(ADD_ATTRIBUTES_MODAL_ID, true)
  }

  return (
    <div
      className="flex flex-col items-center p-16"
      data-testid="product-create-attributes-form"
    >
      <StackedFocusModal id={ADD_ATTRIBUTES_MODAL_ID}>
        <ProductCreateAddAttributesModal replace={replace} />
      </StackedFocusModal>

      <div className="flex w-full max-w-[720px] flex-col gap-y-8">
        <div>
          <Heading level="h2">
            {t("products.create.attributes.header")}
          </Heading>
          <Text
            size="small"
            className="text-ui-fg-subtle mt-1 whitespace-pre-line"
          >
            {t("products.create.attributes.description")}
          </Text>
        </div>

        <div className="flex items-center justify-start gap-x-2">
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={handleAddExisting}
            data-testid="product-create-attributes-add-existing"
          >
            {t("products.create.attributes.addExisting")}
          </Button>
        </div>

        {fields.some((f) => !f.is_custom && !!f.attribute_id) && (
          <SelectedAttributes fields={fields} remove={remove} />
        )}

        <RequiredAttributes replace={replace} />

        <Divider />

        <PhysicalAttributesSection />
      </div>
    </div>
  )
}

const PhysicalAttributesSection = () => {
  const { t } = useTranslation()
  const form = useTabbedForm<ProductCreateSchemaType>()

  return (
    <div
      className="flex flex-col gap-y-6"
      data-testid="product-create-physical-attributes"
    >
      <div>
        <Heading level="h2">{t("products.attributes")}</Heading>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Form.Field
          control={form.control}
          name="weight"
          render={({ field }) => (
            <Form.Item>
              <Form.Label optional>{t("fields.weight")}</Form.Label>
              <Form.Control>
                <Input type="number" {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="width"
          render={({ field }) => (
            <Form.Item>
              <Form.Label optional>{t("fields.width")}</Form.Label>
              <Form.Control>
                <Input type="number" {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="length"
          render={({ field }) => (
            <Form.Item>
              <Form.Label optional>{t("fields.length")}</Form.Label>
              <Form.Control>
                <Input type="number" {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="height"
          render={({ field }) => (
            <Form.Item>
              <Form.Label optional>{t("fields.height")}</Form.Label>
              <Form.Control>
                <Input type="number" {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="mid_code"
          render={({ field }) => (
            <Form.Item>
              <Form.Label optional>{t("fields.midCode")}</Form.Label>
              <Form.Control>
                <Input {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="hs_code"
          render={({ field }) => (
            <Form.Item>
              <Form.Label optional>{t("fields.hsCode")}</Form.Label>
              <Form.Control>
                <Input {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={form.control}
          name="origin_country"
          render={({ field }) => (
            <Form.Item>
              <Form.Label>{t("fields.countryOfOrigin")}</Form.Label>
              <Form.Control>
                <CountrySelect {...field} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
      </div>
    </div>
  )
}

const SelectedAttributes = ({
  fields,
  remove,
}: {
  fields: FieldArrayWithId<ProductCreateSchemaType, "attributes", "id">[]
  remove: UseFieldArrayRemove
}) => {
  const { t } = useTranslation()
  const form = useTabbedForm<ProductCreateSchemaType>()

  const entries = fields
    .map((field, index) => ({ field, index }))
    .filter(
      ({ field }) =>
        !field.is_custom && !field.is_required && !!field.attribute_id
    )

  if (!entries.length) return null

  return (
    <ul
      className="flex flex-col gap-y-4"
      data-testid="product-create-selected-attributes-list"
    >
      {entries.map(({ field, index }) => {
        const attrType = field.type as AttributeType | undefined
        const availableValues = field.available_values ?? []

        return (
          <li
            key={field.id}
            className="bg-ui-bg-component shadow-elevation-card-rest grid grid-cols-[1fr_28px] items-start gap-1.5 rounded-xl p-1.5"
            data-testid={`product-create-selected-attribute-row-${index}`}
          >
            <div className="grid grid-cols-[min-content,1fr] items-center gap-1.5">
              <div className="flex items-center px-2 py-1.5">
                <Label
                  size="xsmall"
                  weight="plus"
                  className="text-ui-fg-subtle"
                >
                  {t("fields.title")}
                </Label>
              </div>
              <Input
                value={field.title}
                disabled
                className="bg-ui-bg-field-component"
                data-testid={`product-create-selected-attribute-title-${index}`}
              />
              <div className="flex items-center px-2 py-1.5">
                <Label
                  size="xsmall"
                  weight="plus"
                  className="text-ui-fg-subtle"
                >
                  {t("fields.values")}
                </Label>
              </div>
              {attrType === AttributeType.MULTI_SELECT ? (
                <Controller
                  control={form.control}
                  name={`attributes.${index}.values`}
                  render={({ field: { onChange, value, ref, ...rest } }) => (
                    <Combobox
                      {...rest}
                      ref={ref}
                      value={Array.isArray(value) ? value : []}
                      onChange={(val) => onChange(val ?? [])}
                      options={availableValues.map((v) => ({
                        value: v.name,
                        label: v.name,
                      }))}
                      placeholder={t(
                        "products.create.attributes.selectValues"
                      )}
                    />
                  )}
                />
              ) : attrType === AttributeType.SINGLE_SELECT ? (
                <Controller
                  control={form.control}
                  name={`attributes.${index}.values`}
                  render={({ field: { onChange, value, ref, ...rest } }) => (
                    <Select
                      {...rest}
                      value={typeof value === "string" ? value : value?.[0] ?? ""}
                      onValueChange={onChange}
                    >
                      <Select.Trigger ref={ref}>
                        <Select.Value
                          placeholder={t(
                            "products.create.attributes.selectValuePlaceholder"
                          )}
                        />
                      </Select.Trigger>
                      <Select.Content>
                        {availableValues.map((v) => (
                          <Select.Item key={v.id} value={v.name}>
                            {v.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  )}
                />
              ) : attrType === AttributeType.TEXT ? (
                <Controller
                  control={form.control}
                  name={`attributes.${index}.values`}
                  render={({ field: { onChange, value, ...rest } }) => (
                    <Textarea
                      {...rest}
                      className="bg-ui-bg-field-component hover:bg-ui-bg-field-component-hover"
                      value={
                        typeof value === "string"
                          ? value
                          : value?.[0] ?? ""
                      }
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={t(
                        "products.create.attributes.enterValuePlaceholder"
                      )}
                    />
                  )}
                />
              ) : attrType === AttributeType.TOGGLE ? (
                <Controller
                  control={form.control}
                  name={`attributes.${index}.values`}
                  render={({ field: { onChange, value, ...rest } }) => (
                    <Select
                      {...rest}
                      value={typeof value === "string" ? value : value?.[0] ?? ""}
                      onValueChange={onChange}
                    >
                      <Select.Trigger>
                        <Select.Value
                          placeholder={t(
                            "products.create.attributes.selectValuePlaceholder"
                          )}
                        />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="true">
                          {t("filters.radio.yes")}
                        </Select.Item>
                        <Select.Item value="false">
                          {t("filters.radio.no")}
                        </Select.Item>
                      </Select.Content>
                    </Select>
                  )}
                />
              ) : (
                <Controller
                  control={form.control}
                  name={`attributes.${index}.values`}
                  render={({ field: { onChange, value, ...rest } }) => (
                    <Input
                      {...rest}
                      value={
                        typeof value === "string"
                          ? value
                          : value?.[0] ?? ""
                      }
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={t(
                        "products.create.attributes.enterValuePlaceholder"
                      )}
                    />
                  )}
                />
              )}
              {field.use_for_variants && (
                <>
                  <div />
                  <VariantAxisTip className="border-none" />
                </>
              )}
            </div>
            <IconButton
              type="button"
              size="small"
              variant="transparent"
              className="text-ui-fg-muted"
              onClick={() => remove(index)}
              data-testid={`product-create-selected-attribute-remove-${index}`}
            >
              <XMarkMini />
            </IconButton>
          </li>
        )
      })}
    </ul>
  )
}

const RequiredAttributes = ({
  replace,
}: {
  replace: UseFieldArrayReplace<ProductCreateSchemaType, "attributes">
}) => {
  const { t } = useTranslation()
  const form = useTabbedForm<ProductCreateSchemaType>()
  const categoryId = form.watch("category_id")

  const { product_attributes } = useProductAttributes(
    {
      category_id: categoryId,
      is_required: true,
    },
    { enabled: !!categoryId }
  )

  const attributes = form.watch("attributes") || []

  useEffect(() => {
    if (!product_attributes) return

    const currentAttributes = form.getValues("attributes") || []
    const requiredIds = new Set(
      product_attributes.map((a: ProductAttributeDTO) => a.id)
    )

    // Keep all non-required attributes (custom + modal-added) untouched
    const otherAttributes = currentAttributes.filter(
      (a) => a.is_custom || !requiredIds.has(a.attribute_id ?? "")
    )

    // Merge required attributes — preserve existing values if already in form
    const requiredAttributes = product_attributes.map(
      (attr: ProductAttributeDTO) => {
      const existing = currentAttributes.find(
        (a) => a.attribute_id === attr.id
      )
      if (existing) return existing

      return {
        attribute_id: attr.id,
        title: attr.name,
        values:
          attr.type === AttributeType.MULTI_SELECT
            ? ([] as string[])
            : attr.type === AttributeType.TOGGLE
              ? "false"
              : "",
        is_custom: false,
        is_required: true,
        use_for_variants: attr.is_variant_axis,
        type: attr.type,
        available_values:
          attr.values?.map((v) => ({ id: v.id, name: v.name })) ?? [],
      }
    })

    const nextAttributes = [...otherAttributes, ...requiredAttributes]

    // Skip the write entirely once the merge is already a no-op — `replace`
    // always remounts every field-array row (fresh RHF `id` keys), so
    // calling it unconditionally on every render would blow away in-progress
    // edits (e.g. a Combobox that's mid-selection) for no reason.
    const isUnchanged =
      currentAttributes.length === nextAttributes.length &&
      currentAttributes.every((a, i) => a === nextAttributes[i])

    if (isUnchanged) return

    // `replace` (not `form.setValue`) is required here: this field array is
    // also driven by `useFieldArray` in the parent (for the free-form
    // attribute list) and by the "add existing" modal. Writing the array via
    // `setValue` bypasses `useFieldArray`'s internal id-tracking, so its
    // `fields` snapshot drifts from the real form values — the required
    // attributes (Ürün Durumu, Marka, Menşei) then render a second, stale
    // copy alongside the correct one. `replace` is the field array's own
    // whole-array mutator and keeps every subscriber of this field name in
    // sync.
    replace(nextAttributes)
  }, [product_attributes, form, replace])

  if (!categoryId || !product_attributes?.length) return null

  const requiredEntries = attributes
    .map((attr, index) => ({ attr, index }))
    .filter(({ attr }) => !attr.is_custom)

  return (
    <>
      <div className="border-ui-border-base border-t border-dashed" />

      <div
        className="flex flex-col gap-y-6"
        data-testid="product-create-attributes-required"
      >
        <div>
          <Text size="small" weight="plus" leading="compact">
            {t("products.create.attributes.requiredAttributes")}
          </Text>
          <Text size="small" className="text-ui-fg-subtle">
            {t("products.create.attributes.requiredAttributesHint")}
          </Text>
        </div>

        {requiredEntries.map(({ attr, index }) => {
          const apiAttr = product_attributes.find(
            (a: ProductAttributeDTO) => a.id === attr.attribute_id
          )
          if (!apiAttr) return null

          return (
            <RequiredAttributeField
              key={apiAttr.id}
              attribute={apiAttr}
              index={index}
            />
          )
        })}
      </div>
    </>
  )
}

const RequiredAttributeField = ({
  attribute,
  index,
}: {
  attribute: ProductAttributeDTO
  index: number
}) => {
  const { t } = useTranslation()
  const form = useTabbedForm<ProductCreateSchemaType>()

  return (
    <Form.Field
      control={form.control}
      name={`attributes.${index}.values`}
      render={({ field: { onChange, value, ref, ...field } }) => (
        <Form.Item>
          <Form.Label>
            {attribute.name}
          </Form.Label>

          <Form.Control>
            {attribute.type === AttributeType.SINGLE_SELECT ? (
              <Select
                {...field}
                value={typeof value === "string" ? value : value?.[0] ?? ""}
                onValueChange={onChange}
              >
                <Select.Trigger ref={ref}>
                  <Select.Value
                    placeholder={t(
                      "products.create.attributes.selectValuePlaceholder"
                    )}
                  />
                </Select.Trigger>
                <Select.Content>
                  {attribute.values?.map((v) => (
                    <Select.Item key={v.id} value={v.name}>
                      {v.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            ) : attribute.type === AttributeType.MULTI_SELECT ? (
              <Combobox
                {...field}
                ref={ref}
                value={Array.isArray(value) ? value : []}
                onChange={(val) => onChange(val ?? [])}
                options={
                  attribute.values?.map((v) => ({
                    value: v.name,
                    label: v.name,
                  })) ?? []
                }
                placeholder={t(
                  "products.create.attributes.selectValues"
                )}
              />
            ) : attribute.type === AttributeType.TEXT ? (
              <Input
                {...field}
                ref={ref}
                value={typeof value === "string" ? value : value?.[0] ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t(
                  "products.create.attributes.enterValuePlaceholder"
                )}
              />
            ) : attribute.type === AttributeType.TOGGLE ? (
              <Switch
                {...field}
                className="rtl:rotate-180"
                checked={value === "true" || (value as unknown) === true}
                onCheckedChange={(checked) => onChange(String(checked))}
              />
            ) : (
              <Input
                {...field}
                ref={ref}
                value={typeof value === "string" ? value : value?.[0] ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t(
                  "products.create.attributes.enterValuePlaceholder"
                )}
              />
            )}
          </Form.Control>
          <Form.ErrorMessage />

          {attribute.is_variant_axis && <VariantAxisTip />}
        </Form.Item>
      )}
    />
  )
}

const VariantAxisTip = ({ className }: { className?: string }) => {
  const { t } = useTranslation()

  return (
    <InlineTip
      className={className}
      label={t("products.create.attributes.tip")}
    >
      {t("products.create.attributes.variantAxisTip")}
    </InlineTip>
  )
}

Root._tabMeta = defineTabMeta<ProductCreateSchemaType>({
  id: "attributes",
  labelKey: "products.create.tabs.attributes",
  validationFields: ["attributes", "origin_country"],
})

export const ProductCreateAttributesForm = Root
