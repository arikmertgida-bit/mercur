import { Button, Input, toast } from "@medusajs/ui"
import i18n from "i18next"
import { useEffect, useRef } from "react"
import { useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import {
  FormExtensionZone,
  isValidHandleFormat,
  toHandle,
  useExtendableForm,
} from "@mercurjs/dashboard-shared"
import { HttpTypes } from "@medusajs/types"
import { Form } from "../../../../../components/common/form"
import { HandleInput } from "../../../../../components/inputs/handle-input"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useUpdateCollection } from "../../../../../hooks/api/collections"

type EditCollectionFormProps = {
  collection: HttpTypes.AdminCollection
}

const EditCollectionSchema = zod.object({
  title: zod
    .string()
    .min(1, { message: i18n.t("collections.validation.titleRequired") }),
  handle: zod
    .string()
    .min(1)
    .refine(isValidHandleFormat, { message: i18n.t("fields.handleInvalidFormat") }),
})

export const EditCollectionForm = ({ collection }: EditCollectionFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const form = useExtendableForm({
    schema: EditCollectionSchema,
    model: "collection",
    zone: "edit",
    data: collection,
    defaultValues: {
      title: collection.title,
      handle: collection.handle,
    },
  })

  const titleValue = useWatch({ control: form.control, name: "title" })
  const isInitialTitleRender = useRef(true)

  useEffect(() => {
    if (isInitialTitleRender.current) {
      isInitialTitleRender.current = false
      return
    }

    form.setValue("handle", toHandle(titleValue ?? ""), {
      shouldValidate: true,
      shouldDirty: false,
    })
  }, [titleValue, form])

  const { mutateAsync, isPending } = useUpdateCollection(collection.id)

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(data, {
      onSuccess: () => {
        toast.success(t("collections.updateSuccess"))
        handleSuccess()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <RouteDrawer.Body>
          <div className="flex flex-col gap-y-4">
            <Form.Field
              control={form.control}
              name="title"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label>{t("fields.title")}</Form.Label>
                    <Form.Control>
                      <Input {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="handle"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label tooltip={t("collections.handleTooltip")}>
                      {t("fields.handle")}
                    </Form.Label>
                    <Form.Control>
                      <HandleInput {...field} disabled />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <FormExtensionZone
              model="collection"
              zone="edit"
              control={form.control}
              data={collection}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
