import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Avatar, StatusBadge, Text } from "@medusajs/ui";
import { DateCell, DateHeader, Thumbnail } from "@mercurjs/dashboard-shared";
import { ReviewDTO } from "../../api/reviews";
import { useCustomerAvatar } from "../../useCustomerAvatar";
import { ReplyStatusBadge } from "../../../routes/reviews/components/ReplyStatusBadge";

const columnHelper = createColumnHelper<ReviewDTO>();

// Panel-local copy of the storefront's default avatar — same asset,
// self-hosted so the fallback never depends on cross-origin availability.
const DEFAULT_CUSTOMER_AVATAR = "/images/customer-default-avatar.jpeg";

const ratingColor = (rating: number) => {
  if (rating >= 4) return "green" as const;
  if (rating >= 3) return "orange" as const;
  return "red" as const;
};

const CUSTOMER_NOTE_PREVIEW_LENGTH = 50;

const truncateCustomerNote = (note: string): string =>
  note.length > CUSTOMER_NOTE_PREVIEW_LENGTH
    ? `${note.slice(0, CUSTOMER_NOTE_PREVIEW_LENGTH)}...`
    : note;

const ReviewCustomerCell = ({ review }: { review: ReviewDTO }) => {
  const { t } = useTranslation();
  const { avatarUrl } = useCustomerAvatar(review.customer?.id ?? undefined);

  const fullName = [review.customer?.first_name, review.customer?.last_name]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(" ");
  const displayName = fullName || t("messenger.unknown");

  return (
    <div className="flex items-center gap-x-3 overflow-hidden">
      <Avatar src={avatarUrl || DEFAULT_CUSTOMER_AVATAR} fallback="" size="small" />
      <Text size="small" leading="compact" className="truncate">
        {displayName}
      </Text>
    </div>
  );
};

export const useReviewTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.display({
        id: "customer",
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">{t("fields.customer")}</span>
          </div>
        ),
        cell: ({ row }) => <ReviewCustomerCell review={row.original} />,
      }),
      columnHelper.accessor("rating", {
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">{t("reviews.columns.rating")}</span>
          </div>
        ),
        cell: ({ getValue }) => {
          const rating = getValue();
          return (
            <StatusBadge color={ratingColor(rating)}>{rating} / 5</StatusBadge>
          );
        },
      }),
      columnHelper.accessor("reference", {
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">{t("reviews.columns.reference")}</span>
          </div>
        ),
        cell: ({ row }) => {
          const { reference, product } = row.original;

          if (reference === "product" && product) {
            return (
              <Link
                to={`/products/${product.id}`}
                onClick={(event) => event.stopPropagation()}
                className="flex items-center gap-x-2 overflow-hidden"
              >
                <Thumbnail src={product.thumbnail} alt={product.title} size="small" />
                <span className="text-ui-fg-subtle truncate text-sm">
                  {product.title}
                </span>
              </Link>
            );
          }

          return (
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {reference === "seller" ? t("store.domain") : "-"}
            </Text>
          );
        },
      }),
      columnHelper.accessor("customer_note", {
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">{t("reviews.columns.customerNote")}</span>
          </div>
        ),
        cell: ({ getValue }) => {
          const note = getValue();
          return (
            <div className="flex h-full w-full items-center overflow-hidden">
              <Text
                size="small"
                leading="compact"
                className="text-ui-fg-subtle truncate"
              >
                {note ? truncateCustomerNote(note) : "-"}
              </Text>
            </div>
          );
        },
      }),
      columnHelper.accessor("is_awaiting_reply", {
        id: "reply_status",
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">{t("reviews.columns.replyStatus")}</span>
          </div>
        ),
        cell: ({ getValue }) => <ReplyStatusBadge answered={!getValue()} />,
      }),
      columnHelper.accessor("created_at", {
        header: () => <DateHeader />,
        cell: ({ getValue }) => {
          const date = new Date(getValue());
          return <DateCell date={date} />;
        },
      }),
    ],
    [t],
  );
};
