import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui";
import {
  ImageLightbox,
  SingleColumnPageSkeleton,
  SingleColumnPage,
} from "@mercurjs/dashboard-shared";

import {
  useResolveReviewReport,
  useReviewReport,
} from "../../../../hooks/api/review-reports";

export const handle = {
  breadcrumb: () => i18n.t("requests.reviews.navLabel"),
};

const STATUS_COLOR: Record<
  "pending" | "resolved_deleted" | "resolved_kept",
  "orange" | "red" | "grey"
> = {
  pending: "orange",
  resolved_deleted: "red",
  resolved_kept: "grey",
};

const ratingColor = (rating: number) => {
  if (rating >= 4) return "green" as const;
  if (rating >= 3) return "orange" as const;
  return "red" as const;
};

const AdminReviewReportDetailPage = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const dialog = usePrompt();

  const { report, isLoading, isError, error } = useReviewReport(id!);
  const { mutateAsync: resolve, isPending } = useResolveReviewReport(id!);

  const [rejectNote, setRejectNote] = useState(
    t("requests.reviews.detail.defaultRejectNote"),
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (isLoading || !report) {
    return <SingleColumnPageSkeleton sections={3} />;
  }

  if (isError) {
    throw error;
  }

  const handleDelete = async () => {
    const confirmed = await dialog({
      title: t("requests.reviews.detail.deletePrompt.title"),
      description: t("requests.reviews.detail.deletePrompt.description"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await resolve({ action: "delete", admin_note: t("requests.reviews.detail.defaultDeleteNote") });
      toast.success(t("requests.reviews.detail.resolveSuccess"));
    } catch {
      toast.error(t("requests.reviews.detail.resolveError"));
    }
  };

  const handleReject = async () => {
    try {
      await resolve({ action: "reject", admin_note: rejectNote });
      toast.success(t("requests.reviews.detail.resolveSuccess"));
    } catch {
      toast.error(t("requests.reviews.detail.resolveError"));
    }
  };

  return (
    <SingleColumnPage>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading>{t("requests.reviews.detail.reportHeading")}</Heading>
          <StatusBadge color={STATUS_COLOR[report.status]}>
            {t(`requests.reviews.status.${report.status}`)}
          </StatusBadge>
        </div>
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            {t("requests.reviews.columns.seller")}
          </Text>
          <Text size="small" leading="compact">
            {report.seller_name}
          </Text>
        </div>
        <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            {t("requests.reviews.columns.reason")}
          </Text>
          <Text size="small" leading="compact">
            {report.reason}
          </Text>
        </div>
        {report.admin_note && (
          <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
            <Text size="small" leading="compact" weight="plus">
              {t("requests.reviews.columns.adminNote")}
            </Text>
            <Text size="small" leading="compact">
              {report.admin_note}
            </Text>
          </div>
        )}
      </Container>

      {report.review && (
        <Container className="divide-y p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <Heading level="h2">{t("requests.reviews.detail.reviewHeading")}</Heading>
            <StatusBadge color={ratingColor(report.review.rating)}>
              {report.review.rating} / 5
            </StatusBadge>
          </div>
          <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
            <Text size="small" leading="compact" weight="plus">
              {t("requests.reviews.detail.customerNote")}
            </Text>
            <Text size="small" leading="compact">
              {report.review.customer_note || "-"}
            </Text>
          </div>
          {report.review.images.length > 0 && (
            <div className="px-6 py-4">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {report.review.images.map((image, imageIndex) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setLightboxIndex(imageIndex)}
                    className="relative block aspect-square overflow-hidden rounded-md border border-ui-border-base"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
              <ImageLightbox
                images={report.review.images}
                index={lightboxIndex}
                onIndexChange={setLightboxIndex}
              />
            </div>
          )}
        </Container>
      )}

      {report.status === "pending" && (
        <Container className="divide-y p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <Heading level="h2">{t("requests.reviews.detail.resolveHeading")}</Heading>
          </div>
          <div className="flex flex-col gap-y-4 px-6 py-4">
            <Textarea
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              rows={3}
              maxLength={1000}
            />
            <div className="flex items-center justify-end gap-x-2">
              <Button
                size="small"
                variant="secondary"
                isLoading={isPending}
                disabled={rejectNote.trim().length === 0}
                onClick={handleReject}
              >
                {t("requests.reviews.detail.rejectAction")}
              </Button>
              <Button
                size="small"
                variant="danger"
                isLoading={isPending}
                onClick={handleDelete}
              >
                {t("actions.delete")}
              </Button>
            </div>
          </div>
        </Container>
      )}
    </SingleColumnPage>
  );
};

export default AdminReviewReportDetailPage;
