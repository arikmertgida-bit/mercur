import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Heading, Input, Text, toast } from "@medusajs/ui";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as zod from "zod";

import {
  Form,
  RouteFocusModal,
  useRouteModal,
} from "@mercurjs/dashboard-shared";
import { useCreateProductTagRequest } from "../../../../hooks/api/requests";

const CreateTagRequestSchema = zod.object({
  value: zod.string().min(1),
});

const TagRequestCreateForm = () => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();

  const form = useForm<zod.infer<typeof CreateTagRequestSchema>>({
    defaultValues: {
      value: "",
    },
    resolver: zodResolver(CreateTagRequestSchema),
  });

  const { mutateAsync, isPending } = useCreateProductTagRequest();

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(data, {
      onSuccess: () => {
        toast.success(t("requests.tags.create.successToast"));
        handleSuccess(`/requests/tags`);
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
        <RouteFocusModal.Body className="flex size-full flex-col items-center p-16">
          <div className="flex w-full max-w-[720px] flex-col gap-y-8">
            <div>
              <Heading>{t("requests.tags.create.heading")}</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {t("requests.tags.create.description")}
              </Text>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Form.Field
                control={form.control}
                name="value"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>
                      {t("productTags.fields.value")}
                    </Form.Label>
                    <Form.Control>
                      <Input autoComplete="off" {...field} />
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

const TagRequestCreatePage = () => {
  const { t } = useTranslation();

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("requests.tags.create.heading")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">
          {t("requests.tags.create.description")}
        </span>
      </RouteFocusModal.Description>
      <TagRequestCreateForm />
    </RouteFocusModal>
  );
};

export default TagRequestCreatePage;
