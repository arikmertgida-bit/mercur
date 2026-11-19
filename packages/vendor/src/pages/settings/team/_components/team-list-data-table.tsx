import { useMemo } from "react";

import { PencilSquare, Trash } from "@medusajs/icons";
import { keepPreviousData } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { toast, usePrompt } from "@medusajs/ui";

import { ActionMenu } from "@components/common/action-menu";
import { _DataTable } from "@components/table/data-table";
import { DateCell } from "@components/table/table-cells/common/date-cell";
import { useMe, useSellerMembers, useRemoveSellerMember } from "@hooks/api";
import { useMemberTableQuery } from "@hooks/table/query";
import { useDataTable } from "@hooks/use-data-table";
import { SectionNoAccess, isForbidden } from "@mercurjs/dashboard-shared";
import type { SellerMemberDTO } from "@mercurjs/types";

import { MemberGrantCell } from "../common/member-grant-cell";

const PAGE_SIZE = 20;

export const TeamListDataTable = () => {
  const { t } = useTranslation();
  const { seller_member } = useMe();
  const sellerId = seller_member?.seller?.id;

  const { searchParams, raw } = useMemberTableQuery({ pageSize: PAGE_SIZE });
  const { seller_members, count, isPending, isError, error } = useSellerMembers(
    sellerId ?? "",
    searchParams,
    {
      placeholderData: keepPreviousData,
      enabled: !!sellerId,
    },
  );

  const columns = useColumns(sellerId ?? "", seller_member?.id ?? "");

  const { table } = useDataTable({
    data: seller_members ?? [],
    columns,
    enablePagination: true,
    count,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row.id,
  });

  if (isForbidden(error)) {
    return <SectionNoAccess />;
  }

  if (isError) {
    throw error;
  }

  return (
    <_DataTable
      table={table}
      columns={columns}
      count={count}
      pageSize={PAGE_SIZE}
      pagination
      isLoading={isPending}
      queryObject={raw}
      orderBy={[
        { key: "created_at", label: t("fields.createdAt") },
        { key: "updated_at", label: t("fields.updatedAt") },
      ]}
      noRecords={{
        message: t("users.list.empty.description"),
      }}
    />
  );
};

const columnHelper = createColumnHelper<SellerMemberDTO>();

const useColumns = (sellerId: string, currentMemberId: string) => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.accessor("member.email", {
        header: () => (
          <div className="flex h-full w-full items-center">
            <span>{t("fields.email")}</span>
          </div>
        ),
        cell: ({ row }) => {
          return (
            <div className="flex size-full items-center overflow-hidden">
              <span className="truncate">{row.original.member?.email}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("role_id", {
        header: () => (
          <div className="flex h-full w-full items-center">
            <span>{t("fields.role")}</span>
          </div>
        ),
        cell: ({ row }) => (
          <MemberGrantCell
            roleId={row.original.role_id}
            customPermissions={row.original.custom_permissions}
            testId={`team-member-grant-${row.original.id}`}
          />
        ),
      }),
      columnHelper.accessor("created_at", {
        header: () => (
          <div className="flex h-full w-full items-center">
            <span>{t("fields.createdAt")}</span>
          </div>
        ),
        cell: ({ getValue }) => {
          const date = getValue();
          return <DateCell date={date ? new Date(date) : null} />;
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          if (row.original.is_owner || row.original.id === currentMemberId) {
            return null;
          }
          return <MemberActions member={row.original} sellerId={sellerId} />;
        },
      }),
    ],
    [t, sellerId, currentMemberId],
  );
};

const MemberActions = ({
  member,
  sellerId,
}: {
  member: SellerMemberDTO;
  sellerId: string;
}) => {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const { mutateAsync: removeMember } = useRemoveSellerMember(
    sellerId,
    member.id,
  );

  const handleRemove = async () => {
    const confirmed = await prompt({
      title: t("general.areYouSure"),
      description: t("users.deleteUserWarning", {
        name: member.member?.email,
      }),
      confirmText: t("actions.remove"),
      cancelText: t("actions.cancel"),
    });
    if (!confirmed) {
      return;
    }

    try {
      await removeMember();
      toast.success(
        t("users.deleteUserSuccess", {
          name: member.member?.email,
        }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <PencilSquare />,
              permission: "members:edit",
              label: t("users.permissions.edit"),
              to: `${member.id}/permissions`,
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              permission: "members:manage",
              label: t("actions.remove"),
              onClick: handleRemove,
            },
          ],
        },
      ]}
    />
  );
};
