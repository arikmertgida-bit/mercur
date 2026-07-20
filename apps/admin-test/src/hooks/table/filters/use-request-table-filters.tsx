import { useTranslation } from "react-i18next";
import { useMemo } from "react";

import type { Filter } from "@mercurjs/dashboard-shared";

export const useRequestTableFilters = (): Filter[] => {
  const { t } = useTranslation();

  return useMemo(() => {
    const filters: Filter[] = [
      {
        key: "request_status",
        label: t("requests.filters.status"),
        type: "select",
        multiple: true,
        options: [
          { label: t("requests.status.draft"), value: "draft" },
          { label: t("requests.status.pending"), value: "pending" },
          { label: t("requests.status.accepted"), value: "accepted" },
          { label: t("requests.status.rejected"), value: "rejected" },
        ],
      },
    ];

    const dateFilters: Filter[] = [
      { label: t("fields.createdAt"), key: "created_at" },
      { label: t("fields.updatedAt"), key: "updated_at" },
    ].map((f) => ({
      key: f.key,
      label: f.label,
      type: "date" as const,
    }));

    filters.push(...dateFilters);

    return filters;
  }, [t]);
};
