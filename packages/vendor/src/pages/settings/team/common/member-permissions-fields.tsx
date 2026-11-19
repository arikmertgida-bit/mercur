import { Badge, Select, Text } from "@medusajs/ui";
import { PERMISSION_RIGHTS, type MemberAreaPermissions } from "@mercurjs/types/permissions";
import { SellerRole } from "@mercurjs/types/seller";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import * as zod from "zod";

import { Form } from "@components/common/form";
import type { MemberPermissionAreas } from "@hooks/api";
import { useDocumentDirection } from "@hooks/use-document-direction";

import { MemberPermissionsTable } from "./member-permissions-table";
import { isAdministrationRole, isCustomGrant, templateFor } from "./member-permissions";

export const MEMBER_ROLE_OPTIONS = [
  { value: SellerRole.SELLER_ADMINISTRATION, labelKey: "users.roles.administration" },
  { value: SellerRole.INVENTORY_MANAGEMENT, labelKey: "users.roles.inventoryManagement" },
  { value: SellerRole.ORDER_MANAGEMENT, labelKey: "users.roles.orderManagement" },
  { value: SellerRole.ACCOUNTING, labelKey: "users.roles.accounting" },
  { value: SellerRole.SUPPORT, labelKey: "users.roles.support" },
];

export const MEMBER_ROLE_LABEL_KEYS: Record<string, string> = Object.fromEntries(
  MEMBER_ROLE_OPTIONS.map((role) => [role.value, role.labelKey]),
);

// The select starts empty (""), so the field is a string until it holds one
// of the seller roles the member routes accept.
export const memberRoleIdSchema = zod
  .string()
  .min(1, { error: () => i18n.t("users.inviteForm.validation.roleRequired") })
  .pipe(zod.enum(SellerRole));

export const memberPermissionsMapSchema = zod.record(zod.string(), zod.enum(PERMISSION_RIGHTS));

/** A member without administration must hold at least one checked area. */
export const grantsSomething = (values: {
  role_id: string;
  permissions: MemberAreaPermissions;
}): boolean => isAdministrationRole(values.role_id) || Object.keys(values.permissions).length > 0;

export const permissionsRequiredIssue = {
  path: ["permissions"],
  error: () => i18n.t("users.permissions.validation.required"),
};

export const MemberPermissionsSchema = zod
  .object({ role_id: memberRoleIdSchema, permissions: memberPermissionsMapSchema })
  .refine(grantsSomething, permissionsRequiredIssue);

export type MemberPermissionsFormValues = {
  role_id: string;
  permissions: MemberAreaPermissions;
};

type MemberPermissionsFieldsProps = {
  data: MemberPermissionAreas;
};

/** Role template select and the checkbox table, shared by invite and edit. */
export const MemberPermissionsFields = ({ data }: MemberPermissionsFieldsProps) => {
  const { t } = useTranslation();
  const direction = useDocumentDirection();
  const { control, setValue } = useFormContext<MemberPermissionsFormValues>();
  const roleId = useWatch({ control, name: "role_id" });
  const permissions = useWatch({ control, name: "permissions" });

  const administration = isAdministrationRole(roleId);
  const custom = roleId !== "" && isCustomGrant(roleId, permissions, data);

  return (
    <div className="flex flex-col gap-y-4">
      <Form.Field
        control={control}
        name="role_id"
        render={({ field: { onChange, ref, ...field } }) => (
          <Form.Item>
            <Form.Label>{t("fields.role")}</Form.Label>
            <Form.Control>
              <Select
                {...field}
                dir={direction}
                onValueChange={(next) => {
                  onChange(next);
                  setValue("permissions", templateFor(next, data), {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              >
                <Select.Trigger ref={ref} data-testid="member-permissions-role-select">
                  <Select.Value placeholder={t("users.selectRole")} />
                </Select.Trigger>
                <Select.Content>
                  {MEMBER_ROLE_OPTIONS.map((role) => (
                    <Select.Item
                      key={role.value}
                      value={role.value}
                      data-testid={`member-permissions-role-option-${role.value}`}
                    >
                      {t(role.labelKey)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </Form.Control>
            <Form.Hint>{t("users.permissions.templateHint")}</Form.Hint>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
      <Form.Field
        control={control}
        name="permissions"
        render={({ field: { value, onChange } }) => (
          <Form.Item>
            <div className="flex items-center gap-x-2">
              <Text size="small" leading="compact" weight="plus">
                {t("users.permissions.title")}
              </Text>
              {custom && (
                <Badge size="2xsmall" color="blue" data-testid="member-permissions-custom-badge">
                  {t("users.permissions.custom")}
                </Badge>
              )}
            </div>
            <Text size="small" className="text-ui-fg-subtle">
              {administration
                ? t("users.permissions.administrationHint")
                : t("users.permissions.hint")}
            </Text>
            <MemberPermissionsTable
              areas={data.areas}
              value={value}
              onChange={onChange}
              disabled={administration}
            />
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
    </div>
  );
};
