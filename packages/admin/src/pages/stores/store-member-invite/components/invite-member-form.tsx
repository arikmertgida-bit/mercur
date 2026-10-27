import { usePermissions, useRequiredParam } from "@mercurjs/dashboard-shared";
import { zodResolver } from "@hookform/resolvers/zod";
import i18n from "i18next";
import { Button, Input, Select, Text, clx, toast } from "@medusajs/ui";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as zod from "zod";

import { Form } from "../../../../components/common/form";
import { RouteDrawer, useRouteModal } from "../../../../components/modals";
import { KeyboundForm } from "../../../../components/utilities/keybound-form";
import { useMembers } from "../../../../hooks/api/members";
import {
  useAddSellerMember,
  useInviteSellerMember,
  useSellerInvites,
  useSellerMembers,
} from "../../../../hooks/api/sellers";
import { SellerRole } from "@mercurjs/types";

const ROLE_OPTIONS = [
  {
    value: SellerRole.SELLER_ADMINISTRATION,
    labelKey: "users.roles.administration",
  },
  {
    value: SellerRole.INVENTORY_MANAGEMENT,
    labelKey: "users.roles.inventoryManagement",
  },
  {
    value: SellerRole.ORDER_MANAGEMENT,
    labelKey: "users.roles.orderManagement",
  },
  { value: SellerRole.ACCOUNTING, labelKey: "users.roles.accounting" },
  { value: SellerRole.SUPPORT, labelKey: "users.roles.support" },
];

const InviteMemberSchema = zod.object({
  email: zod
    .string()
    .min(1, { message: i18n.t("stores.create.validation.emailRequired") })
    .email({ message: i18n.t("stores.create.validation.emailInvalid") }),
  // The select starts empty (""), so the field is a string until it holds
  // one of the seller roles the member endpoints accept.
  role_id: zod
    .string()
    .min(1, { message: i18n.t("stores.members.addUser.validation.roleRequired") })
    .pipe(zod.enum(SellerRole)),
});

export const InviteMemberForm = () => {
  const { t } = useTranslation();
  const id = useRequiredParam("id");
  const { handleSuccess } = useRouteModal();

  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      role_id: "",
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    resolver: zodResolver(InviteMemberSchema),
  });

  const emailValue = form.watch("email");

  const { can } = usePermissions();
  const canViewMembers = can("members");

  const { members } = useMembers(
    { q: emailValue || undefined, limit: 10 },
    { placeholderData: (prev) => prev, enabled: canViewMembers },
  );

  // Fetch current sellers members and pending invites so we can filter
  // suggestions to never show emails that are already added or invited.
  const { seller_members: currentMembers } = useSellerMembers(
    id,
    {
      limit: 100,
      offset: 0,
    },
    { enabled: canViewMembers },
  );

  const { member_invites: pendingInvites } = useSellerInvites(id, undefined, {
    enabled: can("members.invites"),
  });

  const existingEmails = useMemo(() => {
    const emails = new Set<string>();
    (
      currentMembers ?? []
    ).forEach((sm) => {
      const email = sm.member?.email;
      if (email) {
        emails.add(email.toLowerCase());
      }
    });
    (pendingInvites ?? [])
      .filter((invite) => !invite.accepted)
      .forEach((invite) => {
        if (invite.email) {
          emails.add(invite.email.toLowerCase());
        }
      });
    return emails;
  }, [currentMembers, pendingInvites]);

  const memberList = useMemo(() => {
    const all = members ?? [];
    return all.filter(
      (m) => !existingEmails.has(m.email.toLowerCase()),
    );
  }, [members, existingEmails]);

  const { mutateAsync: inviteMember, isPending: isInviting } =
    useInviteSellerMember(id);
  const { mutateAsync: addMember, isPending: isAdding } = useAddSellerMember(
    id,
  );

  const isPending = isInviting || isAdding;

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const matched = memberList.find(
        (m) => m.email.toLowerCase() === values.email.toLowerCase(),
      );

      if (matched) {
        await addMember({
          member_id: matched.id,
          role_id: values.role_id,
        });
        toast.success(t("stores.members.addUser.addedToast"));
      } else {
        await inviteMember({
          email: values.email,
          role_id: values.role_id,
        });
        toast.success(t("stores.members.addUser.invitedToast"));
      }

      handleSuccess();
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)));
    }
  });

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-col gap-y-6 overflow-y-auto">
          <Text size="small" className="text-ui-fg-subtle">
            {t("stores.members.addUser.hint")}
          </Text>
          <Form.Field
            control={form.control}
            name="email"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("fields.email")}</Form.Label>
                <Form.Control>
                  <div className="relative">
                    <Input
                      {...field}
                      autoComplete="off"
                      onFocus={() => setSuggestionsOpen(true)}
                      onBlur={() => {
                        field.onBlur();
                        setTimeout(() => setSuggestionsOpen(false), 150);
                      }}
                    />
                    {suggestionsOpen && memberList.length > 0 && (
                      <div
                        className={clx(
                          "bg-ui-bg-base shadow-elevation-flyout border-ui-border-base absolute z-50 mt-1 flex max-h-60 w-full flex-col overflow-y-auto rounded-md border p-1",
                        )}
                      >
                        {memberList.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              field.onChange(member.email);
                              setSuggestionsOpen(false);
                            }}
                            className="hover:bg-ui-bg-base-hover text-ui-fg-base flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm"
                          >
                            {member.email}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="role_id"
            render={({ field: { onChange, ref, ...field } }) => (
              <Form.Item>
                <Form.Label>{t("fields.role")}</Form.Label>
                <Form.Control>
                  <Select {...field} onValueChange={onChange}>
                    <Select.Trigger ref={ref}>
                      <Select.Value placeholder={t("fields.selectPlaceholder")} />
                    </Select.Trigger>
                    <Select.Content>
                      {ROLE_OPTIONS.map((role) => (
                        <Select.Item key={role.value} value={role.value}>
                          {t(role.labelKey)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary" type="button">
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
  );
};
