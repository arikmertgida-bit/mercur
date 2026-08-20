import { useTranslation } from "react-i18next";
import { StatusBadge } from "@medusajs/ui";

/**
 * Shared between the reviews list column and the review detail page's
 * Yanıt section so both surfaces render the exact same "Cevaplandı" /
 * "Cevap Bekliyor" visual language.
 */
export const ReplyStatusBadge = ({ answered }: { answered: boolean }) => {
  const { t } = useTranslation();

  if (answered) {
    return <StatusBadge color="green">{t("reviews.status.answered")}</StatusBadge>;
  }

  return (
    <span className="bg-brand inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white">
      {t("reviews.status.awaitingReply")}
    </span>
  );
};
