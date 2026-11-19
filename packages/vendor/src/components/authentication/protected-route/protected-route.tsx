import { Spinner } from "@medusajs/icons";
import { PermissionsProvider, type DescribePermission } from "@mercurjs/dashboard-shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMe } from "../../../hooks/api/members";
import { describePermissionKey } from "../../../lib/permissions/permission-labels";
import { SearchProvider } from "../../../providers/search-provider";
import { SidebarProvider } from "../../../providers/sidebar-provider";

export const ProtectedRoute = () => {
  const { seller_member, isLoading } = useMe();
  const location = useLocation();
  const { t } = useTranslation();

  const describePermission: DescribePermission = useCallback(
    (key, right) => {
      const label = describePermissionKey(key, right);
      if (!label) {
        return null;
      }
      const area = t(label.labelKey);
      return label.administrationOnly
        ? t("users.permissions.administrationOnlyItem", { area })
        : t("users.permissions.requiredItem", {
            area,
            right: t(`users.permissions.rights.${label.right}`),
          });
    },
    [t],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="text-ui-fg-interactive animate-spin" />
      </div>
    );
  }

  if (!seller_member) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <PermissionsProvider
      permissions={seller_member.permissions ?? null}
      describePermission={describePermission}
      grantHint={t("permissions.accessDenied.grantHint")}
    >
      <SidebarProvider>
        <SearchProvider>
          <Outlet />
        </SearchProvider>
      </SidebarProvider>
    </PermissionsProvider>
  );
};
