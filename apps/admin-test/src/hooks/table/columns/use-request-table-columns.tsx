import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { StatusBadge, Text } from "@medusajs/ui";
import { DateCell, DateHeader } from "@mercurjs/dashboard-shared";
import { RequestDTO } from "../../api/requests";

const columnHelper = createColumnHelper<RequestDTO>();

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

// `RequestDTO`'s non-schema fields (like "created_at") come through the
// backend's `RequestEntityResponseSchema.catchall(JsonPrimitiveSchema)`, so
// this is a real, bounded union — not `unknown`.
const toDisplayDate = (
  value: string | number | boolean | Date | null | undefined
): Date =>
  typeof value === "string" || typeof value === "number" || value instanceof Date
    ? new Date(value)
    : new Date(0);

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
