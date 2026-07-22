import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
  toast,
} from "@medusajs/ui";
import type { RouteConfig } from "@mercurjs/dashboard-sdk";
import { NoRecords } from "@mercurjs/dashboard-shared";

import {
  ReviewReportDTO,
  useCreateReviewReport,
  useReviewReports,
} from "../../../hooks/api/review-reports";

export const config: RouteConfig = {
  label: "reviews.navLabel",
  translationNs: "requests",
  nested: "/requests",
};

export const handle = {
  breadcrumb: () => i18n.t("requests.reviews.navLabel"),
};

const STATUS_COLOR: Record<ReviewReportDTO["status"], "orange" | "red" | "grey"> = {
  pending: "orange",
  resolved_deleted: "red",
  resolved_kept: "grey",
};

const PAGE_SIZE = 20;

const VendorReviewReportsPage = () => {
  const { t } = useTranslation();
  const [offset, setOffset] = useState(0);

  const { reports, count, isLoading } = useReviewReports({
    limit: PAGE_SIZE,
    offset,
  });
  const { mutateAsync: reReport, isPending: isReReporting } =
    useCreateReviewReport();

  const handleReReport = async (report: ReviewReportDTO) => {
    try {
      await reReport({ review_id: report.review_id, reason: report.reason });
      toast.success(t("requests.reviews.reReportSuccess"));
    } catch {
      toast.error(t("requests.reviews.reReportError"));
    }
  };

  const rows = reports ?? [];
  const totalCount = count ?? 0;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("requests.reviews.heading")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("requests.reviews.subtitle")}
          </Text>
        </div>
      </div>

      {!isLoading && rows.length === 0 ? (
        <NoRecords />
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>
                {t("requests.reviews.columns.reason")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("requests.reviews.columns.status")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("requests.reviews.columns.adminNote")}
              </Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((report) => (
              <Table.Row key={report.id}>
                <Table.Cell>
                  <Text size="small" className="max-w-[320px] truncate">
                    {report.reason}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <StatusBadge color={STATUS_COLOR[report.status]}>
                    {t(`requests.reviews.status.${report.status}`)}
                  </StatusBadge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="text-ui-fg-subtle max-w-[360px]">
                    {report.admin_note || "-"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  {report.status === "resolved_kept" && (
                    <Button
                      size="small"
                      variant="secondary"
                      isLoading={isReReporting}
                      onClick={() => handleReReport(report)}
                    >
                      {t("requests.reviews.reReport")}
                    </Button>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {totalCount > PAGE_SIZE ? (
        <Table.Pagination
          count={totalCount}
          pageSize={PAGE_SIZE}
          pageIndex={offset / PAGE_SIZE}
          pageCount={Math.ceil(totalCount / PAGE_SIZE)}
          canPreviousPage={offset > 0}
          canNextPage={offset + PAGE_SIZE < totalCount}
          previousPage={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          nextPage={() => setOffset(offset + PAGE_SIZE)}
        />
      ) : null}
    </Container>
  );
};

export default VendorReviewReportsPage;
