import { Button, Heading, Text } from "@medusajs/ui";
import { useRequiredParam } from "@mercurjs/dashboard-shared";
import { useTranslation } from "react-i18next";

import { RouteDrawer } from "@components/modals";
import { useMe, useMemberPermissionAreas, useSellerMembers } from "@hooks/api";

import { isolateLtr } from "../common/member-permissions";

import { EditMemberPermissionsForm } from "./_components/edit-member-permissions-form";

export const TeamMemberPermissions = () => {
  const id = useRequiredParam("id");
  const { t } = useTranslation();
  const { seller_member: me } = useMe();
  const sellerId = me?.seller?.id ?? "";
  const memberQuery = { id };

  const members = useSellerMembers(sellerId, memberQuery, {
    enabled: Boolean(sellerId),
  });
  const areas = useMemberPermissionAreas();

  if (members.isError) {
    throw members.error;
  }
  if (areas.isError) {
    throw areas.error;
  }

  const member = members.seller_members?.[0];
  const loaded = !members.isPending && !!areas.data;
  const editable = !!member && !member.is_owner && member.id !== me?.id;

  // Owner, self or a member that is gone: say why there is nothing to edit.
  const notice = !loaded
    ? null
    : !member
      ? t("users.permissions.notFound")
      : !editable
        ? t("users.permissions.notEditable")
        : null;

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("users.permissions.edit")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="text-ui-fg-subtle">
          {member?.member?.email
            ? t("users.permissions.editDescription", { email: isolateLtr(member.member.email) })
            : t("users.permissions.edit")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {loaded && editable && member && areas.data && (
        <EditMemberPermissionsForm sellerId={sellerId} member={member} data={areas.data} />
      )}
      {notice && (
        <>
          <RouteDrawer.Body>
            <Text size="small" data-testid="member-permissions-not-editable">
              {notice}
            </Text>
          </RouteDrawer.Body>
          <RouteDrawer.Footer>
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary" data-testid="member-permissions-close">
                {t("actions.close")}
              </Button>
            </RouteDrawer.Close>
          </RouteDrawer.Footer>
        </>
      )}
    </RouteDrawer>
  );
};
