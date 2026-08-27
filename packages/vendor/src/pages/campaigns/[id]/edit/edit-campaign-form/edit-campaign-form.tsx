import { AdminCampaign } from "@medusajs/types"
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
import { Form } from "@components/common/form"
import { HandleInput } from "@components/inputs/handle-input"
import { RouteDrawer, useRouteModal } from "@components/modals"
import { KeyboundForm } from "@components/utilities/keybound-form"
import { useUpdateCampaign } from "@hooks/api/campaigns"

type EditCampaignFormProps = {
  campaign: AdminCampaign
}

const EditCampaignSchema = zod.object({
  name: zod.string(),
  description: zod.string().optional(),
  campaign_identifier: zod
    .string()
    .optional()
    .or(zod.literal(""))
    .refine((value) => !value || isValidHandleFormat(value), {
      message: i18n.t("fields.handleInvalidFormat"),
    }),
})

export const EditCampaignForm = ({ campaign }: EditCampaignFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const form = useExtendableForm({
    schema: EditCampaignSchema,
    model: "campaign",
    zone: "edit",
    data: campaign,
    defaultValues: {
      name: campaign.name || "",
      description: campaign.description || "",
      campaign_identifier: campaign.campaign_identifier || "",
    },
  })

  const nameValue = useWatch({ control: form.control, name: "name" })
  const isInitialNameRender = useRef(true)

  useEffect(() => {
    if (isInitialNameRender.current) {
      isInitialNameRender.current = false
      return
    }

    form.setValue("campaign_identifier", toHandle(nameValue ?? ""), {
      shouldValidate: true,
      shouldDirty: false,
    })
  }, [nameValue, form])

  const { mutateAsync, isPending } = useUpdateCampaign(campaign.id)

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(
      {
        name: data.name,
        description: data.description,
        campaign_identifier: data.campaign_identifier,
      },
      {
        onSuccess: ({ campaign }) => {
          toast.success(
            t("campaigns.edit.successToast", {
              name: campaign.name,
            })
          )

          handleSuccess()
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <RouteDrawer.Body>
          <div className="flex flex-col gap-y-4">
            <Form.Field
              control={form.control}
              name="name"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label>{t("fields.name")}</Form.Label>

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
              name="campaign_identifier"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label tooltip={t("campaigns.fields.identifierTooltip")}>
                      {t("campaigns.fields.identifier")}
                    </Form.Label>

                    <Form.Control>
                      <HandleInput
                        {...field}
                        value={field.value ?? ""}
                        disabled
                        placeholder={t("campaigns.fields.identifierPlaceholder")}
                      />
                    </Form.Control>

                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />

            <Form.Field
              control={form.control}
              name="description"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>{t("fields.description")}</Form.Label>

                    <Form.Control>
                      <Input {...field} />
                    </Form.Control>

                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />

            <FormExtensionZone
              model="campaign"
              zone="edit"
              control={form.control}
              data={campaign}
            />
          </div>
        </RouteDrawer.Body>

        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>

            <Button
              isLoading={isPending}
              type="submit"
              variant="primary"
              size="small"
            >
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
