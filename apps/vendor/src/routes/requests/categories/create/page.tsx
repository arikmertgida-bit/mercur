import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Heading,
  Input,
  Select,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as zod from "zod";

import {
  Form,
  HandleInput,
  RouteFocusModal,
  toHandle,
  useRouteModal,
} from "@mercurjs/dashboard-shared";
import { useCreateProductCategoryRequest } from "../../../../hooks/api/requests";

const CreateCategoryRequestSchema = zod.object({
  name: zod.string().min(1),
  handle: zod.string().optional(),
  description: zod.string().optional(),
  is_active: zod.boolean().optional(),
  is_internal: zod.boolean().optional(),
});

const CategoryRequestCreateForm = () => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();

  const form = useForm<zod.infer<typeof CreateCategoryRequestSchema>>({
    defaultValues: {
      name: "",
      handle: "",
      description: "",
      is_active: true,
      is_internal: false,
    },
    resolver: zodResolver(CreateCategoryRequestSchema),
  });

  const { mutateAsync, isPending } = useCreateProductCategoryRequest();

  const nameValue = useWatch({ control: form.control, name: "name" });

  useEffect(() => {
    form.setValue("handle", toHandle(nameValue ?? ""), {
      shouldValidate: true,
      shouldDirty: false,
    });
  }, [nameValue, form]);

  const handleSubmit = form.handleSubmit(async ({ handle, ...data }) => {
    const payload = handle ? { ...data, handle } : data;
    await mutateAsync(payload, {
      onSuccess: () => {
        toast.success(t("requests.categories.create.successToast"));
        handleSuccess(`/requests/categories`);
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
              <Heading>{t("requests.categories.create.heading")}</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {t("requests.categories.create.description")}
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
                      <Input autoComplete="off" {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="handle"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional>{t("fields.handle")}</Form.Label>
                    <Form.Control>
                      <HandleInput {...field} disabled />
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
                    <Form.Label optional>{t("fields.description")}</Form.Label>
                    <Form.Control>
                      <Textarea {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t("fields.status")}</Form.Label>
                    <Form.Control>
                      <Select
                        value={field.value ? "active" : "inactive"}
                        onValueChange={(v) => field.onChange(v === "active")}
                      >
                        <Select.Trigger>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="active">
                            {t("categories.fields.status.active")}
                          </Select.Item>
                          <Select.Item value="inactive">
                            {t("categories.fields.status.inactive")}
                          </Select.Item>
                        </Select.Content>
                      </Select>
                    </Form.Control>
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="is_internal"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t("categories.fields.visibility.label")}</Form.Label>
                    <Form.Control>
                      <Select
                        value={field.value ? "internal" : "public"}
                        onValueChange={(v) => field.onChange(v === "internal")}
                      >
                        <Select.Trigger>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="public">
                            {t("categories.fields.visibility.public")}
                          </Select.Item>
                          <Select.Item value="internal">
                            {t("categories.fields.visibility.internal")}
                          </Select.Item>
                        </Select.Content>
                      </Select>
                    </Form.Control>
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

const CategoryRequestCreatePage = () => {
  const { t } = useTranslation();

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">
          {t("requests.categories.create.heading")}
        </span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">
          {t("requests.categories.create.description")}
        </span>
      </RouteFocusModal.Description>
      <CategoryRequestCreateForm />
    </RouteFocusModal>
  );
};

export default CategoryRequestCreatePage;
