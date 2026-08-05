import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Heading, Input, Text, Textarea, toast } from "@medusajs/ui";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as zod from "zod";

import { Form, RouteFocusModal, useRouteModal } from "@mercurjs/dashboard-shared";
import { useCreateReturnReasonRequest } from "../../../../hooks/api/requests";

const CreateReturnReasonRequestSchema = zod.object({
  value: zod.string().min(1),
  label: zod.string().min(1),
  description: zod.string().optional(),
});

const ReturnReasonRequestCreateForm = () => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();

  const form = useForm<zod.infer<typeof CreateReturnReasonRequestSchema>>({
    defaultValues: {
      value: "",
      label: "",
      description: "",
    },
    resolver: zodResolver(CreateReturnReasonRequestSchema),
  });

  const { mutateAsync, isPending } = useCreateReturnReasonRequest();

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(data, {
      onSuccess: () => {
        toast.success(
          t("returnReasons.create.successToast", { label: data.label }),
        );
        handleSuccess(`/requests/return-reasons`);
      },
      onError: (error) => {
        toast.error(error.message || t("requests.createErrorFallback"));
      },
    });
  });

  return (
    <RouteFocusModal.Form form={form}>
      <form
        onSubmit={handleSubmit}
        className="flex h-full flex-col overflow-hidden"
      >
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex size-full flex-col items-center overflow-auto p-16">
          <div className="flex w-full max-w-[720px] flex-col gap-y-8">
            <div>
              <Heading>{t("returnReasons.create.header")}</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {t("returnReasons.create.subtitle")}
              </Text>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Form.Field
                control={form.control}
                name="value"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label tooltip={t("returnReasons.fields.value.tooltip")}>
                      {t("returnReasons.fields.value.label")}
                    </Form.Label>
                    <Form.Control>
                      <Input
                        autoComplete="off"
                        placeholder={t("returnReasons.fields.value.placeholder")}
                        {...field}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="label"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t("returnReasons.fields.label.label")}</Form.Label>
                    <Form.Control>
                      <Input
                        autoComplete="off"
                        placeholder={t("returnReasons.fields.label.placeholder")}
                        {...field}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="description"
                render={({ field }) => (
                  <Form.Item className="col-span-full">
                    <Form.Label optional>
                      {t("returnReasons.fields.description.label")}
                    </Form.Label>
                    <Form.Control>
                      <Textarea
                        placeholder={t("returnReasons.fields.description.placeholder")}
                        {...field}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            </div>
          </div>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <RouteFocusModal.Close asChild>
            <Button size="small" variant="secondary">
              {t("actions.cancel")}
            </Button>
          </RouteFocusModal.Close>
          <Button
            size="small"
            variant="primary"
            type="submit"
            isLoading={isPending}
          >
            {t("actions.create")}
          </Button>
        </RouteFocusModal.Footer>
      </form>
    </RouteFocusModal.Form>
  );
};

const ReturnReasonRequestCreatePage = () => {
  const { t } = useTranslation();

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("returnReasons.create.header")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">{t("returnReasons.create.subtitle")}</span>
      </RouteFocusModal.Description>
      <ReturnReasonRequestCreateForm />
    </RouteFocusModal>
  );
};

export default ReturnReasonRequestCreatePage;
