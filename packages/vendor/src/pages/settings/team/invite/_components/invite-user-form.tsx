import { zodResolver } from "@hookform/resolvers/zod";
import i18n from "i18next";
import {
  Alert,
  Button,
  Container,
  Heading,
  Input,
  StatusBadge,
  Text,
  Tooltip,
  toast,
} from "@medusajs/ui";
import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import * as zod from "zod";

import { Form } from "@components/common/form";
import { RouteFocusModal } from "@components/modals";
import { _DataTable } from "@components/table/data-table";
import { KeyboundForm } from "@components/utilities/keybound-form/keybound-form";
import {
  useMe,
  useCreateInvite,
  useInvites,
  useMemberPermissionAreas,
} from "@hooks/api";
import { useUserInviteTableQuery } from "@hooks/table/query";
import { useDataTable } from "@hooks/use-data-table";
import { useDate } from "@hooks/use-date";
import type { PublicMemberInviteDTO } from "@mercurjs/types";

import { MemberGrantCell } from "../../common/member-grant-cell";
import {
  MemberPermissionsFields,
  grantsSomething,
  memberPermissionsMapSchema,
  memberRoleIdSchema,
  permissionsRequiredIssue,
} from "../../common/member-permissions-fields";
import { isolateLtr, permissionsPayload } from "../../common/member-permissions";

const InviteUserSchema = zod
  .object({
    email: zod
      .string()
      .email({ error: () => i18n.t("users.inviteForm.validation.emailInvalid") }),
    role_id: memberRoleIdSchema,
    permissions: memberPermissionsMapSchema,
  })
  .refine(grantsSomething, permissionsRequiredIssue);

const PAGE_SIZE = 10;
const PREFIX = "usr_invite";

export const InviteUserForm = () => {
  const { t } = useTranslation();
  const { seller_member } = useMe();
  const sellerId = seller_member?.seller?.id;

  const form = useForm({
    defaultValues: {
      email: "",
      role_id: "",
      permissions: {},
    },
    resolver: zodResolver(InviteUserSchema),
  });

  const { raw, searchParams } = useUserInviteTableQuery({
    prefix: PREFIX,
    pageSize: PAGE_SIZE,
  });

  const {
    member_invites,
    count,
    isPending: isLoading,
    isError,
    error,
  } = useInvites(sellerId ?? "", searchParams, {
    enabled: Boolean(sellerId),
  });

  const columns = useColumns();

  const { table } = useDataTable({
    data: member_invites ?? [],
    columns,
    count,
    enablePagination: true,
    getRowId: (row: PublicMemberInviteDTO) => row.id,
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  });

  const { mutateAsync, isPending } = useCreateInvite(sellerId ?? "");
  const areas = useMemberPermissionAreas({ enabled: Boolean(sellerId) });

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!sellerId || !areas.data) {
      return;
    }

    try {
      await mutateAsync({
        email: values.email,
        role_id: values.role_id,
        permissions: permissionsPayload(values.role_id, values.permissions, areas.data),
      });
      toast.success(t("users.permissions.inviteSuccess", { email: isolateLtr(values.email) }));
      form.reset();
    } catch (error) {
      form.setError("root", {
        type: "manual",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  if (isError) {
    throw error;
  }

  if (areas.isError) {
    throw areas.error;
  }

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex h-full flex-col overflow-hidden"
      >
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col items-center overflow-y-auto">
            <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
              <div>
                <Heading>{t("users.inviteUser")}</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  {t("users.inviteUserHint")}
                </Text>
              </div>

              {form.formState.errors.root && (
                <Alert
                  variant="error"
                  dismissible={false}
                  className="text-balance"
                >
                  {form.formState.errors.root.message}
                </Alert>
              )}

              <div className="flex flex-col gap-y-4">
                <Form.Field
                  control={form.control}
                  name="email"
                  render={({ field }) => {
                    return (
                      <Form.Item>
                        <Form.Label>{t("fields.email")}</Form.Label>
                        <Form.Control>
                          <Input {...field} data-testid="member-invite-email-input" />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    );
                  }}
                />
                {areas.data && <MemberPermissionsFields data={areas.data} />}
                <div className="flex items-center justify-end">
                  <Button
                    size="small"
                    variant="secondary"
                    type="submit"
                    isLoading={isPending}
                    disabled={!areas.data}
                    data-testid="member-invite-submit"
                  >
                    {t("users.sendInvite")}
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-y-4">
                <Heading level="h2">{t("users.pendingInvites")}</Heading>
                <Container className="overflow-hidden p-0">
                  <_DataTable
                    table={table}
                    columns={columns}
                    count={count}
                    pageSize={PAGE_SIZE}
                    pagination
                    isLoading={isLoading}
                    queryObject={raw}
                    prefix={PREFIX}
                    orderBy={[
                      { key: "email", label: t("fields.email") },
                      {
                        key: "created_at",
                        label: t("fields.createdAt"),
                      },
                    ]}
                  />
                </Container>
              </div>
            </div>
          </div>
        </RouteFocusModal.Body>
      </KeyboundForm>
    </RouteFocusModal.Form>
  );
};

const columnHelper = createColumnHelper<PublicMemberInviteDTO>();

const useColumns = () => {
  const { t } = useTranslation();
  const { locale } = useDate();

  return useMemo(
    () => [
      columnHelper.accessor("email", {
        header: t("fields.email"),
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor("role_id", {
        header: t("fields.role"),
        cell: ({ row }) => (
          <MemberGrantCell
            roleId={row.original.role_id}
            customPermissions={row.original.custom_permissions}
            testId={`member-invite-grant-${row.original.id}`}
          />
        ),
      }),
      columnHelper.accessor("accepted", {
        header: t("fields.status"),
        cell: ({ getValue, row }) => {
          const accepted = getValue();
          const expired = new Date(row.original.expires_at) < new Date();

          if (accepted) {
            return (
              <Tooltip
                content={t("users.acceptedOnDate", {
                  date: format(
                    new Date(row.original.updated_at),
                    "dd MMM, yyyy",
                    { locale },
                  ),
                })}
              >
                <StatusBadge color="green">
                  {t("users.inviteStatus.accepted")}
                </StatusBadge>
              </Tooltip>
            );
          }

          if (expired) {
            return (
              <Tooltip
                content={t("users.expiredOnDate", {
                  date: format(
                    new Date(row.original.expires_at),
                    "dd MMM, yyyy",
                    { locale },
                  ),
                })}
              >
                <StatusBadge color="red">
                  {t("users.inviteStatus.expired")}
                </StatusBadge>
              </Tooltip>
            );
          }

          return (
            <Tooltip
              content={
                <Trans
                  i18nKey={"users.validFromUntil"}
                  components={[
                    <span key="from" className="font-medium" />,
                    <span key="until" className="font-medium" />,
                  ]}
                  values={{
                    from: format(
                      new Date(row.original.created_at),
                      "dd MMM, yyyy",
                      { locale },
                    ),
                    until: format(
                      new Date(row.original.expires_at),
                      "dd MMM, yyyy",
                      { locale },
                    ),
                  }}
                />
              }
            >
              <StatusBadge color="orange">
                {t("users.inviteStatus.pending")}
              </StatusBadge>
            </Tooltip>
          );
        },
      }),
    ],
    [t, locale],
  );
};
