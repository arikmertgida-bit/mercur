import { Checkbox, Table, Text } from "@medusajs/ui";
import { formatNameList, RTL_TABLE_CLASSNAME } from "@mercurjs/dashboard-shared";
import type { MemberAreaPermissions, PermissionRight } from "@mercurjs/types";
import { useTranslation } from "react-i18next";

import type { MemberPermissionArea } from "@hooks/api";

import {
  MEMBER_PERMISSION_COLUMNS,
  isRightAvailable,
  isRightChecked,
  isRightLocked,
  requiredRights,
  toggleMemberRight,
} from "./member-permissions";

export const MEMBER_RIGHT_LABEL_KEYS: Record<PermissionRight, string> = {
  view: "users.permissions.rights.view",
  edit: "users.permissions.rights.edit",
  manage: "users.permissions.rights.manage",
};

export const memberAreaLabelKey = (areaId: string): string =>
  `users.permissions.areas.${areaId}`;

type MemberPermissionsTableProps = {
  areas: MemberPermissionArea[];
  value: MemberAreaPermissions;
  onChange: (value: MemberAreaPermissions) => void;
  /** Administration: every box checked and locked. */
  disabled?: boolean;
};

export const MemberPermissionsTable = ({
  areas,
  value,
  onChange,
  disabled = false,
}: MemberPermissionsTableProps) => {
  const { t, i18n } = useTranslation();
  const required = requiredRights(value, areas);

  return (
    <div className="shadow-elevation-card-rest bg-ui-bg-base overflow-x-auto rounded-lg">
      <Table className={RTL_TABLE_CLASSNAME} data-testid="member-permissions-table">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell className="text-start">
              {t("users.permissions.area")}
            </Table.HeaderCell>
            {MEMBER_PERMISSION_COLUMNS.map((column) => (
              <Table.HeaderCell key={column} className="w-px whitespace-nowrap text-center">
                {t(MEMBER_RIGHT_LABEL_KEYS[column])}
              </Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {areas.map((area) => {
            const areaLabel = t(memberAreaLabelKey(area.id));
            const requiredBy = required.get(area.id)?.requiredBy ?? [];

            return (
              <Table.Row
                key={area.id}
                data-testid={`member-permissions-row-${area.id}`}
              >
                <Table.Cell className="py-2">
                  <Text size="small" leading="compact" weight="plus">
                    {areaLabel}
                  </Text>
                  {requiredBy.length > 0 && !disabled && (
                    <Text
                      size="xsmall"
                      className="text-ui-fg-subtle"
                      data-testid={`member-permissions-row-${area.id}-required`}
                    >
                      {t("users.permissions.requiredBy", {
                        areas: formatNameList(
                          requiredBy.map((id) => t(memberAreaLabelKey(id))),
                          i18n.language,
                          "unit",
                        ),
                      })}
                    </Text>
                  )}
                </Table.Cell>
                {MEMBER_PERMISSION_COLUMNS.map((column) => {
                  if (!isRightAvailable(area, column)) {
                    return (
                      <Table.Cell key={column} className="text-center">
                        <span aria-hidden className="text-ui-fg-muted">
                          –
                        </span>
                      </Table.Cell>
                    );
                  }

                  const locked =
                    disabled || isRightLocked(required, area.id, column);

                  return (
                    <Table.Cell key={column} className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={disabled || isRightChecked(value, area.id, column)}
                          disabled={locked}
                          aria-label={`${areaLabel}: ${t(MEMBER_RIGHT_LABEL_KEYS[column])}`}
                          data-testid={`member-permissions-row-${area.id}-${column}`}
                          onCheckedChange={(checked) =>
                            onChange(
                              toggleMemberRight(
                                value,
                                areas,
                                area.id,
                                column,
                                checked === true,
                              ),
                            )
                          }
                        />
                      </div>
                    </Table.Cell>
                  );
                })}
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </div>
  );
};
