import { useTranslation } from "react-i18next";
import { Avatar, Text } from "@medusajs/ui";
import type { ReviewDTO } from "../../api/reviews";
import { useCustomerAvatar } from "../../useCustomerAvatar";

// Panel-local copy of the storefront's default avatar — same asset,
// self-hosted so the fallback never depends on cross-origin availability.
const DEFAULT_CUSTOMER_AVATAR = "/images/customer-default-avatar.jpeg";

export const ReviewCustomerCell = ({ review }: { review: ReviewDTO }): React.JSX.Element => {
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
