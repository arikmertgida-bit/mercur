import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Heading, Input, Text, toast } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { Form } from "@components/common/form"
import { RouteFocusModal, useRouteModal } from "@components/modals"
import { KeyboundForm } from "@components/utilities/keybound-form"
import { useCreateShippingProfile } from "@hooks/api/shipping-profiles"

const CreateShippingProfileSchema = zod.object({
  name: zod.string().trim().min(1),
  type: zod.string().trim().min(1),
})

type CreateShippingProfileValues = zod.infer<typeof CreateShippingProfileSchema>

export const CreateShippingProfileForm = () => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const form = useForm<CreateShippingProfileValues>({
    defaultValues: {
      name: "",
      type: "",
    },
    resolver: zodResolver(CreateShippingProfileSchema),
  })

  const { mutateAsync, isPending } = useCreateShippingProfile()

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(
      { name: values.name, type: values.type },
      {
        onSuccess: ({ shipping_profile }) => {
          toast.success(
            t("shippingProfile.create.successToast", {
              name: shipping_profile.name,
            })
          )

          handleSuccess(
            `/settings/locations/shipping-profiles/${shipping_profile.id}`
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
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex h-full flex-col overflow-hidden"
      >
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col items-center overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
              <div>
                <Heading>{t("shippingProfile.create.header")}</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  {t("shippingProfile.create.hint")}
                </Text>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Form.Field
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Label>{t("fields.name")}</Form.Label>
                      <Form.Control>
                        <Input
                          autoComplete="off"
                          data-testid="shipping-profile-create-form-name-input"
                          {...field}
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Label tooltip={t("shippingProfile.tooltip.type")}>
                        {t("fields.type")}
                      </Form.Label>
                      <Form.Control>
                        <Input
                          autoComplete="off"
                          data-testid="shipping-profile-create-form-type-input"
                          {...field}
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
              </div>
            </div>
          </div>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button
              type="submit"
              size="small"
              isLoading={isPending}
              data-testid="shipping-profile-create-form-submit-button"
            >
              {t("actions.save")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}
