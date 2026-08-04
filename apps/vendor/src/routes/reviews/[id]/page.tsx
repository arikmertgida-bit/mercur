import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";

import {
  ImageLightbox,
  Thumbnail,
  TwoColumnPageSkeleton,
  TwoColumnPage,
} from "@mercurjs/dashboard-shared";
import { useReview, useUpdateReview, ReviewDTO } from "../../../hooks/api/reviews";
import { useCreateReviewReport } from "../../../hooks/api/review-reports";

const REPLY_MAX_LENGTH = 300;
const REPORT_REASON_MAX_LENGTH = 500;

const ratingColor = (rating: number) => {
  if (rating >= 4) return "green" as const;
  if (rating >= 3) return "orange" as const;
  return "red" as const;
};

const ReviewGeneralSection = ({ review }: { review: ReviewDTO }) => {
  const { t, i18n } = useTranslation();

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>{review.id}</Heading>
        <div className="flex items-center gap-x-2">
          <StatusBadge color={ratingColor(review.rating)}>
            {review.rating} / 5
          </StatusBadge>
        </div>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("reviews.columns.reference")}
        </Text>
        {review.reference === "product" && review.product ? (
          <Link
            to={`/products/${review.product.id}`}
            className="flex items-center gap-x-2 overflow-hidden"
          >
            <Thumbnail src={review.product.thumbnail} alt={review.product.title} size="small" />
            <span className="truncate text-sm">{review.product.title}</span>
          </Link>
        ) : (
          <Text size="small" leading="compact">
            {review.reference === "seller" ? t("store.domain") : "-"}
          </Text>
        )}
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("reviews.columns.customerNote")}
        </Text>
        <Text size="small" leading="compact">
          {review.customer_note || "-"}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("reviews.columns.createdAt")}
        </Text>
        <Text size="small" leading="compact">
          {new Date(review.created_at).toLocaleDateString(i18n.language, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("reviews.columns.updatedAt")}
        </Text>
        <Text size="small" leading="compact">
          {new Date(review.updated_at).toLocaleDateString(i18n.language, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </div>
    </Container>
  );
};

const ReviewPhotosSection = ({ review }: { review: ReviewDTO }) => {
  const { t } = useTranslation();
  const images = review.images ?? [];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("reviews.photos")}</Heading>
      </div>
      <div className="px-6 py-4">
        {images.length === 0 ? (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {t("reviews.noPhotos")}
          </Text>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {images.map((image, imageIndex) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setLightboxIndex(imageIndex)}
                className="relative block aspect-square overflow-hidden rounded-md border border-ui-border-base"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="size-full object-cover"
                />
                {image.is_hidden && (
                  <span className="bg-ui-tag-red-bg text-ui-tag-red-text absolute right-1 top-1 rounded px-1.5 py-0.5 text-xs">
                    {t("reviews.hiddenPhoto")}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <ImageLightbox
        images={images}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </Container>
  );
};

const ReviewReplySection = ({ review }: { review: ReviewDTO }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState(review.seller_note ?? "");
  const { mutateAsync, isPending } = useUpdateReview(review.id);

  const handleSubmit = async () => {
    try {
      await mutateAsync({ seller_note: content });
      toast.success(t("reviews.reply.successToast"));
    } catch {
      toast.error(t("reviews.reply.errorToast"));
    }
  };

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("reviews.reply.title")}</Heading>
      </div>
      <div className="flex flex-col gap-y-4 px-6 py-4">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={t("reviews.reply.placeholder")}
          rows={4}
          maxLength={REPLY_MAX_LENGTH}
        />
        <div className="flex justify-end">
          <Button
            size="small"
            onClick={handleSubmit}
            isLoading={isPending}
            disabled={content.trim().length === 0}
          >
            {t("reviews.reply.submit")}
          </Button>
        </div>
      </div>
    </Container>
  );
};

const ReviewReportSection = ({ review }: { review: ReviewDTO }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const { mutateAsync, isPending } = useCreateReviewReport();

  const handleSubmit = async () => {
    try {
      await mutateAsync({ review_id: review.id, reason });
      toast.success(t("reviews.report.successToast"));
      setReason("");
    } catch {
      toast.error(t("reviews.report.errorToast"));
    }
  };

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("reviews.report.title")}</Heading>
      </div>
      <div className="flex flex-col gap-y-4 px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          {t("reviews.report.description")}
        </Text>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("reviews.report.placeholder")}
          rows={4}
          maxLength={REPORT_REASON_MAX_LENGTH}
        />
        <div className="flex justify-end">
          <Button
            size="small"
            variant="danger"
            onClick={handleSubmit}
            isLoading={isPending}
            disabled={reason.trim().length === 0}
          >
            {t("reviews.report.submit")}
          </Button>
        </div>
      </div>
    </Container>
  );
};

export const ReviewDetailPage = () => {
  const { id } = useParams();

  const { review, isLoading, isError, error } = useReview(id!);

  if (isLoading || !review) {
    return <TwoColumnPageSkeleton mainSections={3} sidebarSections={1} showMetadata />;
  }

  if (isError) {
    throw error;
  }

  return (
    <TwoColumnPage data={review} showMetadata>
      <TwoColumnPage.Main>
        <ReviewGeneralSection review={review} />
        <ReviewPhotosSection review={review} />
        <ReviewReplySection review={review} />
      </TwoColumnPage.Main>
      <TwoColumnPage.Sidebar>
        <ReviewReportSection review={review} />
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  );
};

export default ReviewDetailPage;
