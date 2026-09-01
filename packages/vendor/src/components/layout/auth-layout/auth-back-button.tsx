import { ArrowLeft } from "@medusajs/icons";
import { IconButton, Tooltip } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { MEDUSA_STOREFRONT_URL } from "../../../utils/storefront-url";

export const AuthBackButton = () => {
  const { t } = useTranslation();
  const label = t("auth.backToStore");

  return (
    <Tooltip content={label}>
      <IconButton
        asChild
        variant="transparent"
        size="small"
        className="text-ui-fg-subtle hover:text-ui-fg-base"
      >
        <a
          href={MEDUSA_STOREFRONT_URL}
          aria-label={label}
          data-testid="auth-back-to-store-link"
        >
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </a>
      </IconButton>
    </Tooltip>
  );
};
