import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@medusajs/ui";
import type { SellerMemberDTO } from "@mercurjs/types";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { RouteDrawer, useRouteModal } from "@components/modals";
import { KeyboundForm } from "@components/utilities/keybound-form/keybound-form";
import { type MemberPermissionAreas, useUpdateMemberRole } from "@hooks/api";

import {
  MemberPermissionsFields,
  MemberPermissionsSchema,
} from "../../common/member-permissions-fields";
import { effectiveGrant, isolateLtr, permissionsPayload } from "../../common/member-permissions";

type EditMemberPermissionsFormProps = {
  sellerId: string;
  member: SellerMemberDTO;
  data: MemberPermissionAreas;
};

export const EditMemberPermissionsForm = ({
  sellerId,
  member,
  data,
}: EditMemberPermissionsFormProps) => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();

  const form = useForm({
    defaultValues: {
      role_id: member.role_id,
      permissions: effectiveGrant(member.role_id, member.custom_permissions, data),
    },
    resolver: zodResolver(MemberPermissionsSchema),
  });

  const { mutateAsync, isPending } = useUpdateMemberRole(sellerId, member.id);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await mutateAsync({
        role_id: values.role_id,
        permissions: permissionsPayload(values.role_id, values.permissions, data),
      });
      toast.success(
        t("users.permissions.editSuccess", { email: isolateLtr(member.member?.email ?? "") }),
      );
      handleSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  });

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
        <RouteDrawer.Body className="flex-1 overflow-y-auto">
          <MemberPermissionsFields data={data} />
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary" data-testid="member-permissions-cancel">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button
              size="small"
              type="submit"
              isLoading={isPending}
              data-testid="member-permissions-save"
            >
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  );
};
