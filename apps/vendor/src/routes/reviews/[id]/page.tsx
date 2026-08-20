import { ChangeEvent, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Photo, XMarkMini } from "@medusajs/icons";
import {
  Avatar,
  Button,
  Container,
  Heading,
  IconButton,
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
import { client } from "../../../lib/client";
import {
  useReview,
  useReviewReplies,
  useUpdateReview,
  ReviewDTO,
  ReviewReplyDTO,
} from "../../../hooks/api/reviews";
import { useCreateReviewReport } from "../../../hooks/api/review-reports";
import { ReplyStatusBadge } from "../components/ReplyStatusBadge";

const REPLY_MAX_LENGTH = 300;
const REPORT_REASON_MAX_LENGTH = 500;
// Keep in sync with apps/api/src/modules/review-reply-images REVIEW_REPLY_MAX_IMAGES.
const REPLY_MAX_IMAGES = 4;

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

const replyDisplayName = (reply: ReviewReplyDTO, fallback: string): string => {
  if (reply.is_seller_reply) {
    return reply.seller_name ?? fallback;
  }
  const fullName = [reply.customer?.first_name, reply.customer?.last_name]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(" ");
  return fullName || fallback;
};

const replyInitials = (name: string): string => (name.trim().charAt(0) || "?").toUpperCase();

const ReviewReplyMessage = ({ reply }: { reply: ReviewReplyDTO }) => {
  const { t, i18n } = useTranslation();
  const name = replyDisplayName(reply, t("messenger.unknown"));
  const timestamp = new Date(reply.created_at).toLocaleString(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const images = reply.images ?? [];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <div className="flex items-start gap-x-3">
      <Avatar
        src={!reply.is_seller_reply ? reply.customer?.avatar_url : undefined}
        fallback={replyInitials(name)}
        size="small"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <Text size="small" weight="plus" leading="compact" className="truncate">
            {name}
          </Text>
          {reply.is_seller_reply && (
            <StatusBadge color="blue">{t("store.domain")}</StatusBadge>
          )}
          <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
            {timestamp}
          </Text>
        </div>
        <Text size="small" leading="compact" className="text-ui-fg-subtle whitespace-pre-line">
          {reply.content}
        </Text>
        {images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((image, imageIndex) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setLightboxIndex(imageIndex)}
                className="border-ui-border-base size-14 overflow-hidden rounded-md border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <ImageLightbox images={images} index={lightboxIndex} onIndexChange={setLightboxIndex} />
    </div>
  );
};

const ReviewReplyThread = ({ reviewId }: { reviewId: string }) => {
  const { t } = useTranslation();
  const { replies, isLoading } = useReviewReplies(reviewId);

  if (isLoading) {
    return null;
  }

  if (!replies || replies.length === 0) {
    return (
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {t("messenger.noMessages")}
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-y-4">
      {replies.map((reply) => (
        <ReviewReplyMessage key={reply.id} reply={reply} />
      ))}
    </div>
  );
};

type PendingReplyImage = { id: string; url: string; file: File };

const ReplyImagePicker = ({
  images,
  onAdd,
  onRemove,
  disabled,
}: {
  images: PendingReplyImage[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      onAdd(files);
    }
    event.target.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-y-2">
      <IconButton
        type="button"
        size="small"
        variant="transparent"
        className="border-ui-border-strong border border-dashed"
        disabled={disabled || images.length >= REPLY_MAX_IMAGES}
        onClick={() => inputRef.current?.click()}
      >
        <Photo />
      </IconButton>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-label={t("reviews.reply.attachImage")}
        onChange={handleChange}
      />
      {images.map((image) => (
        <div
          key={image.id}
          className="border-ui-border-base relative size-10 shrink-0 overflow-hidden rounded-md border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="size-full object-cover" />
          <button
            type="button"
            onClick={() => onRemove(image.id)}
            className="bg-ui-bg-base/90 text-ui-fg-subtle absolute right-0 top-0 flex items-center justify-center rounded-bl-md"
          >
            <XMarkMini />
          </button>
        </div>
      ))}
    </div>
  );
};

const ReviewReplySection = ({ review }: { review: ReviewDTO }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingReplyImage[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const { mutateAsync, isPending } = useUpdateReview(review.id);

  const handleAddImages = (files: File[]) => {
    const room = Math.max(REPLY_MAX_IMAGES - pendingImages.length, 0);
    const accepted = files.slice(0, room);
    const next = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      url: URL.createObjectURL(file),
      file,
    }));
    setPendingImages((prev) => [...prev, ...next]);
  };

  const handleRemoveImage = (id: string) => {
    setPendingImages((prev) => {
      const target = prev.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((image) => image.id !== id);
    });
  };

  const handleSubmit = async () => {
    try {
      let imageUrls: string[] | undefined;
      if (pendingImages.length > 0) {
        setIsUploadingImages(true);
        const uploaded = await client.vendor.uploads.mutate({
          files: pendingImages.map((image) => image.file),
        });
        imageUrls = uploaded.files.map((file) => file.url);
      }

      await mutateAsync({ seller_note: content, image_urls: imageUrls });

      pendingImages.forEach((image) => URL.revokeObjectURL(image.url));
      setContent("");
      setPendingImages([]);
      toast.success(t("reviews.reply.successToast"));
    } catch {
      toast.error(t("reviews.reply.errorToast"));
    } finally {
      setIsUploadingImages(false);
    }
  };

  const isBusy = isPending || isUploadingImages;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("reviews.reply.title")}</Heading>
        <ReplyStatusBadge answered={!review.is_awaiting_reply} />
      </div>
      <div className="px-6 py-4">
        <ReviewReplyThread reviewId={review.id} />
      </div>
      <div className="flex gap-x-3 px-6 py-4">
        <ReplyImagePicker
          images={pendingImages}
          onAdd={handleAddImages}
          onRemove={handleRemoveImage}
          disabled={isBusy}
        />
        <div className="flex flex-1 flex-col gap-y-4">
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
              isLoading={isBusy}
              disabled={content.trim().length === 0}
            >
              {t("reviews.reply.submit")}
            </Button>
          </div>
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
