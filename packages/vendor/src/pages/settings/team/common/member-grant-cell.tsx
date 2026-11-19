import { Badge, Tooltip } from "@medusajs/ui";
import type { MemberAreaPermissions } from "@mercurjs/types";
import { useTranslation } from "react-i18next";

import { useMemberPermissionAreas } from "@hooks/api";

import { MEMBER_ROLE_LABEL_KEYS } from "./member-permissions-fields";
import { MEMBER_RIGHT_LABEL_KEYS, memberAreaLabelKey } from "./member-permissions-table";
import { isAdministrationRole } from "./member-permissions";

type MemberGrantCellProps = {
  roleId: string;
  customPermissions: MemberAreaPermissions | null | undefined;
  testId: string;
};

/** Role label, plus a "Custom" badge listing the checked areas. */
export const MemberGrantCell = ({ roleId, customPermissions, testId }: MemberGrantCellProps) => {
  const { t } = useTranslation();
  const { data } = useMemberPermissionAreas();
  const labelKey = MEMBER_ROLE_LABEL_KEYS[roleId];
  const custom =
    !!customPermissions &&
    !isAdministrationRole(roleId) &&
    Object.keys(customPermissions).length > 0;

  const summary = custom
    ? (data?.areas ?? [])
        .filter((area) => customPermissions[area.id])
        .map((area) =>
          t("users.permissions.summaryItem", {
            area: t(memberAreaLabelKey(area.id)),
            right: t(MEMBER_RIGHT_LABEL_KEYS[customPermissions[area.id]]),
          }),
        )
    : [];

  return (
    <div className="flex size-full items-center gap-x-2 overflow-hidden" data-testid={testId}>
      <span className="truncate">{labelKey ? t(labelKey) : "-"}</span>
      {custom && (
        <Tooltip
          content={
            <ul className="flex flex-col gap-y-0.5">
              {summary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          }
        >
          <button
            type="button"
            className="focus-visible:shadow-borders-focus rounded-md outline-none"
            aria-label={`${t("users.permissions.custom")}: ${summary.join(", ")}`}
            data-testid={`${testId}-custom`}
          >
            <Badge size="2xsmall" color="blue">
              {t("users.permissions.custom")}
            </Badge>
          </button>
        </Tooltip>
      )}
    </div>
  );
};
