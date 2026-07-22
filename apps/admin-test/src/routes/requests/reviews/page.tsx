import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { createColumnHelper } from "@tanstack/react-table";
import { keepPreviousData } from "@tanstack/react-query";
import { Container, Heading, StatusBadge, Text } from "@medusajs/ui";
import type { RouteConfig } from "@mercurjs/dashboard-sdk";
import {
  _DataTable,
  DateCell,
  DateHeader,
  SingleColumnPage,
  useDataTable,
} from "@mercurjs/dashboard-shared";

import {
  ReviewReportRowDTO,
  useReviewReports,
} from "../../../hooks/api/review-reports";
import { useReviewTableQuery } from "../../../hooks/table/query/use-review-table-query";

export const config: RouteConfig = {
  label: "reviews.navLabel",
  translationNs: "requests",
  nested: "/requests",
};

export const handle = {
  breadcrumb: () => i18n.t("requests.reviews.navLabel"),
};

const STATUS_COLOR: Record<ReviewReportRowDTO["status"], "orange" | "red" | "grey"> = {
  pending: "orange",
  resolved_deleted: "red",
  resolved_kept: "grey",
};

const PAGE_SIZE = 20;
const columnHelper = createColumnHelper<ReviewReportRowDTO>();

const AdminReviewReportsPage = () => {
  const { t } = useTranslation();
  const { raw, searchParams } = useReviewTableQuery({ pageSize: PAGE_SIZE });

  const { reports, count, isError, error, isLoading } = useReviewReports(
    searchParams,
    { placeholderData: keepPreviousData },
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("seller_name", {
        header: () => t("requests.reviews.columns.seller"),
        cell: ({ getValue }) => (
          <Text size="small" leading="compact">
            {getValue()}
          </Text>
        ),
      }),
      columnHelper.accessor("reason", {
        header: () => t("requests.reviews.columns.reason"),
        cell: ({ getValue }) => (
          <Text size="small" leading="compact" className="max-w-[320px] truncate">
            {getValue()}
          </Text>
        ),
      }),
      columnHelper.accessor("status", {
        header: () => t("requests.reviews.columns.status"),
        cell: ({ getValue }) => (
          <StatusBadge color={STATUS_COLOR[getValue()]}>
            {t(`requests.reviews.status.${getValue()}`)}
          </StatusBadge>
        ),
      }),
      columnHelper.accessor("created_at", {
        header: () => <DateHeader />,
        cell: ({ getValue }) => <DateCell date={new Date(getValue())} />,
      }),
    ],
    [t],
  );

  const { table } = useDataTable({
    data: reports ?? [],
    columns,
    enablePagination: true,
    count: count,
    pageSize: PAGE_SIZE,
  });

  if (isError) throw error;

  return (
    <SingleColumnPage>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading>{t("requests.reviews.heading")}</Heading>
        </div>
        <_DataTable
          columns={columns}
          table={table}
          pagination
          navigateTo={(row) => `/requests/reviews/${row.original.id}`}
          count={count}
          isLoading={isLoading}
          pageSize={PAGE_SIZE}
          orderBy={[
            { key: "created_at", label: t("fields.createdAt") },
            { key: "updated_at", label: t("fields.updatedAt") },
          ]}
          queryObject={raw}
          noRecords={{ message: t("requests.reviews.noRecords") }}
        />
      </Container>
    </SingleColumnPage>
  );
};

export default AdminReviewReportsPage;
