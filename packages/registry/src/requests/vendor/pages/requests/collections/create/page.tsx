import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Heading, Input, Text, toast } from "@medusajs/ui";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as zod from "zod";

import {
  Form,
  HandleInput,
  RouteFocusModal,
  isValidHandleFormat,
  toHandle,
  useRouteModal,
} from "@mercurjs/dashboard-shared";
import { useCreateVendorRequest } from "../../../../hooks/api/requests";

type TFunction = ReturnType<typeof useTranslation>["t"];

const createCollectionRequestSchema = (t: TFunction) =>
  zod.object({
    title: zod.string().min(1),
    handle: zod
      .string()
      .refine(isValidHandleFormat, { message: t("fields.handleInvalidFormat") }),
  });

type CreateCollectionRequestSchema = ReturnType<typeof createCollectionRequestSchema>;

const CollectionRequestCreateForm = () => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();

  const form = useForm<zod.infer<CreateCollectionRequestSchema>>({
    defaultValues: {
      title: "",
      handle: "",
    },
    resolver: zodResolver(createCollectionRequestSchema(t)),
  });

  const { mutateAsync, isPending } = useCreateVendorRequest(
    "product_collection",
  );

  const titleValue = useWatch({ control: form.control, name: "title" });

  useEffect(() => {
    form.setValue("handle", toHandle(titleValue ?? ""), {
      shouldValidate: true,
      shouldDirty: false,
    });
  }, [titleValue, form.setValue]);

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(data, {
      onSuccess: () => {
        toast.success("Collection request created successfully");
        handleSuccess(`/requests/collections`);
      },
      onError: (error) => {
        toast.error(error.message);
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
              <Heading>Request Collection</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Submit a request to create a new product collection.
              </Text>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Form.Field
                control={form.control}
                name="title"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t("fields.title")}</Form.Label>
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
                    <Form.Label tooltip={t("collections.handleTooltip")}>
                      {t("fields.handle")}
                    </Form.Label>
                    <Form.Control>
                      <HandleInput {...field} disabled />
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

const CollectionRequestCreatePage = () => {
  return (
    <RouteFocusModal>
      <CollectionRequestCreateForm />
    </RouteFocusModal>
  );
};

export default CollectionRequestCreatePage;
