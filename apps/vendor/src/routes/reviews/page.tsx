import { useTranslation } from "react-i18next";
import { keepPreviousData } from "@tanstack/react-query";
import { Container, Heading, Text } from "@medusajs/ui";
import { Star } from "@medusajs/icons";
import type { RouteConfig } from "@mercurjs/dashboard-sdk";

import { _DataTable, SingleColumnPage, useDataTable } from "@mercurjs/dashboard-shared";
import { useReviews, useReviewStats } from "../../hooks/api/reviews";
import { useReviewTableColumns } from "../../hooks/table/columns/use-review-table-columns";
import { useReviewTableQuery } from "../../hooks/table/query/use-review-table-query";
import { useReviewTableFilters } from "../../hooks/table/filters/use-review-table-filters";
import { ReviewsIcon } from "./components/ReviewsIcon";

const PAGE_SIZE = 10;

const SellerAverageRating = () => {
  const { t } = useTranslation();
  const { average_rating, review_count, isLoading } = useReviewStats();

  if (isLoading || average_rating === null || average_rating === undefined) {
    return null;
  }

  return (
    <div className="flex items-center gap-x-1.5">
      <Star className="text-ui-tag-orange-icon" />
      <Text size="small" weight="plus" leading="compact">
        {average_rating.toFixed(1)}
      </Text>
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        ({review_count} {t("reviews.domain")})
      </Text>
    </div>
  );
};

const ReviewListPage = () => {
  const { t } = useTranslation();
  const { raw, searchParams } = useReviewTableQuery({
    pageSize: PAGE_SIZE,
  });

  const { reviews, count, isError, error, isLoading } = useReviews(
    searchParams,
    {
      placeholderData: keepPreviousData,
    },
  );

  const columns = useReviewTableColumns();
  const filters = useReviewTableFilters();

  const { table } = useDataTable({
    data: reviews ?? [],
    columns,
    enablePagination: true,
    count: count,
    pageSize: PAGE_SIZE,
  });

  if (isError) {
    throw error;
  }

  return (
    <SingleColumnPage>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading>{t("reviews.domain")}</Heading>
          <SellerAverageRating />
        </div>
        <_DataTable
          columns={columns}
          table={table}
          pagination
          filters={filters}
          navigateTo={(row) => `/reviews/${row.original.id}`}
          count={count}
          isLoading={isLoading}
          pageSize={PAGE_SIZE}
          orderBy={[
            {
              key: "created_at",
              label: t("fields.createdAt"),
            },
            {
              key: "updated_at",
              label: t("fields.updatedAt"),
            },
          ]}
          queryObject={raw}
          noRecords={{
            message: t("reviews.noRecords"),
          }}
        />
      </Container>
    </SingleColumnPage>
  );
};

export default ReviewListPage;

export const config: RouteConfig = {
  label: "domain",
  translationNs: "reviews",
  icon: ReviewsIcon,
};
