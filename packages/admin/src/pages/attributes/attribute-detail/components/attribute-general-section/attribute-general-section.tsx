import { PencilSquare, Trash } from "@medusajs/icons"
import { Badge, Container, Heading, Prompt, toast, usePrompt } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ClientError } from "@mercurjs/client"
import type { ProductAttributeDTO } from "@mercurjs/types"
import { ProductAttributeErrorCode } from "@mercurjs/types/product"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { SectionRow } from "../../../../../components/common/section/section-row"
import { useDeleteProductAttribute } from "../../../../../hooks/api"

type AttributeGeneralSectionProps = {
  attribute: ProductAttributeDTO
}

export const AttributeGeneralSection = ({
  attribute,
}: AttributeGeneralSectionProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const { mutateAsync } = useDeleteProductAttribute(attribute.id)
  const [inUseOpen, setInUseOpen] = useState(false)

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("general.areYouSure"),
      description: t("attributes.delete.confirmation", {
        name: attribute.name,
      }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!confirmed) {
      return
    }

    try {
      await mutateAsync(undefined)
      toast.success(
        t("attributes.delete.successToast", { name: attribute.name })
      )
      navigate("/settings/attributes", { replace: true })
    } catch (err) {
      if (
        err instanceof ClientError &&
        err.code === ProductAttributeErrorCode.ATTRIBUTE_IN_USE
      ) {
        setInUseOpen(true)
      } else {
        toast.error(err instanceof Error ? err.message : t("general.unknownError"))
      }
    }
  }

  const ATTRIBUTE_TYPE_LABELS: Record<string, string> = {
    single_select: "attributes.type.select",
    multi_select: "attributes.type.multivalue",
    unit: "attributes.type.unit",
    toggle: "attributes.type.toggle",
    text: "attributes.type.text_area",
  }

  const typeLabelKey = ATTRIBUTE_TYPE_LABELS[attribute.type]
  const typeLabel = typeLabelKey ? t(typeLabelKey) : attribute.type

  const isGlobal = !(attribute.categories && attribute.categories.length > 0)

  return (
    <Container
      className="divide-y p-0"
      data-testid="attribute-general-section-container"
    >
      <div
        className="flex items-center justify-between px-6 py-4"
        data-testid="attribute-general-section-header"
      >
        <Heading data-testid="attribute-general-section-heading">
          {attribute.name}
        </Heading>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <PencilSquare />,
                  permission: "product_attributes:edit",
                  label: t("actions.edit"),
                  to: "edit",
                },
              ],
            },
            {
              actions: [
                {
                  icon: <Trash />,
                  permission: "product_attributes:manage",
                  label: t("actions.delete"),
                  onClick: handleDelete,
                },
              ],
            },
          ]}
          data-testid="attribute-general-section-action-menu"
        />
      </div>

      <SectionRow
        title={t("attributes.fields.handle")}
        value={attribute.handle ? `/${attribute.handle}` : "-"}
        data-testid="attribute-general-section-handle"
      />

      <SectionRow
        title={t("attributes.fields.description")}
        value={attribute.description || "-"}
        data-testid="attribute-general-section-description"
      />

      <SectionRow
        title={t("attributes.fields.type")}
        value={typeLabel}
        data-testid="attribute-general-section-type"
      />

      <SectionRow
        title={t("attributes.fields.filterable")}
        value={
          attribute.is_filterable ? t("fields.yes") : t("fields.no")
        }
        data-testid="attribute-general-section-filterable"
      />

      <SectionRow
        title={t("attributes.fields.required")}
        value={
          attribute.is_required ? t("fields.yes") : t("fields.no")
        }
        data-testid="attribute-general-section-required"
      />

      <SectionRow
        title={t("attributes.fields.global")}
        value={isGlobal ? t("fields.yes") : t("fields.no")}
        data-testid="attribute-general-section-global"
      />

      <SectionRow
        title={t("attributes.fields.category")}
        value={
          attribute.categories && attribute.categories.length > 0 ? (
            <div
              className="flex flex-wrap gap-1"
              data-testid="attribute-general-section-categories"
            >
              {attribute.categories.map((category) => (
                <Badge key={category.id} size="2xsmall">
                  {category.name}
                </Badge>
              ))}
            </div>
          ) : (
            "-"
          )
        }
        data-testid="attribute-general-section-categories-row"
      />

      <Prompt open={inUseOpen} variant="confirmation">
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>{t("attributes.delete.title")}</Prompt.Title>
            <Prompt.Description>
              {t("attributes.delete.inUseMessage", {
                name: attribute.name,
              })}
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Action onClick={() => setInUseOpen(false)}>
              {t("attributes.delete.gotIt")}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </Container>
  )
}
