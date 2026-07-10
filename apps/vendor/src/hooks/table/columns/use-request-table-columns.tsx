import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { StatusBadge, Text } from "@medusajs/ui";
import { DateCell, DateHeader } from "@mercurjs/dashboard-shared";

export type VendorRequestNameKey = "name" | "value" | "title";

export type VendorRequestRow = {
  id: string;
  name?: string;
  value?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  custom_fields: {
    request_status: string;
  };
};

const columnHelper = createColumnHelper<VendorRequestRow>();

const statusColor = (status: string) => {
  switch (status) {
    case "accepted":
      return "green" as const;
    case "pending":
      return "orange" as const;
    case "rejected":
      return "red" as const;
    default:
      return "grey" as const;
  }
};

const toDisplayDate = (value: string | undefined): Date =>
  typeof value === "string" ? new Date(value) : new Date(0);

export const useRequestTableColumns = (nameKey: VendorRequestNameKey = "name") => {
  return useMemo(
    () => [
      columnHelper.display({
        id: "display_name",
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">Name</span>
          </div>
        ),
        cell: ({ row }) => {
          const value = row.original[nameKey];
          return (
            <Text size="small" leading="compact">
              {typeof value === "string" ? value : row.original.id}
            </Text>
          );
        },
      }),
      columnHelper.accessor("custom_fields", {
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">Status</span>
          </div>
        ),
        cell: ({ getValue }) => {
          const status = getValue().request_status;
          return (
            <StatusBadge color={statusColor(status)}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </StatusBadge>
          );
        },
      }),
      columnHelper.accessor("created_at", {
        header: () => <DateHeader />,
        cell: ({ getValue }) => <DateCell date={toDisplayDate(getValue())} />,
      }),
    ],
    [nameKey],
  );
};
