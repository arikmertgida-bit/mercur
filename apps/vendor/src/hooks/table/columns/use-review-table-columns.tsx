import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StatusBadge, Text } from "@medusajs/ui";
import { DateCell, DateHeader } from "@mercurjs/dashboard-shared";
import { ReviewDTO } from "../../api/reviews";

const columnHelper = createColumnHelper<ReviewDTO>();

const ratingColor = (rating: number) => {
  if (rating >= 4) return "green" as const;
  if (rating >= 3) return "orange" as const;
  return "red" as const;
};

export const useReviewTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(
    () => [
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
        cell: ({ getValue }) => {
          const reference = getValue();
          return (
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {reference ? reference.charAt(0).toUpperCase() + reference.slice(1) : "-"}
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
                {note || "-"}
              </Text>
            </div>
          );
        },
      }),
      columnHelper.accessor("seller_note", {
        id: "reply_status",
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">{t("reviews.columns.replyStatus")}</span>
          </div>
        ),
        cell: ({ getValue }) => {
          const sellerNote = getValue();
          const answered = Boolean(sellerNote && sellerNote.trim().length > 0);
          if (answered) {
            return <StatusBadge color="green">{t("reviews.status.answered")}</StatusBadge>;
          }
          return (
            <span className="bg-brand inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white">
              {t("reviews.status.awaitingReply")}
            </span>
          );
        },
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
