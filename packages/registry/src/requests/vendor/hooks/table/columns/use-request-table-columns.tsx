import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { StatusBadge, Text } from "@medusajs/ui";
import { DateCell, DateHeader } from "@mercurjs/dashboard-shared";
import { VendorRequestDTO } from "../../api/requests";

const columnHelper = createColumnHelper<VendorRequestDTO>();

const toDisplayDate = (value: VendorRequestDTO[string]): Date =>
  typeof value === "string" || typeof value === "number"
    ? new Date(value)
    : new Date(Number.NaN);

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

export const useRequestTableColumns = (nameKey: string = "name") => {
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
          const name = row.original[nameKey];
          return (
            <Text size="small" leading="compact">
              {typeof name === "string" ? name : row.original.id}
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
          const status = getValue()?.request_status ?? "draft";
          return (
            <StatusBadge color={statusColor(status)}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </StatusBadge>
          );
        },
      }),
      columnHelper.accessor("created_at", {
        header: () => <DateHeader />,
        cell: ({ getValue }) => {
          return <DateCell date={toDisplayDate(getValue())} />;
        },
      }),
    ],
    [nameKey],
  );
};
