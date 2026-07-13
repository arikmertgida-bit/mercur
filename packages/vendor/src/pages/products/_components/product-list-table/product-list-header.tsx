import { Children, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button, Heading } from "@medusajs/ui";

import { useIsSellerActive } from "@hooks/api";
import { sellerSuspensionBridge } from "@lib/seller-suspension-bridge";

export const ProductListTitle = () => {
  const { t } = useTranslation();
  return <Heading level="h2">{t("products.domain")}</Heading>;
};

export const ProductListCreateButton = () => {
  const { t } = useTranslation();
  const isSellerActive = useIsSellerActive();

  if (!isSellerActive) {
    return (
      <Button
        size="small"
        variant="secondary"
        type="button"
        onClick={() => sellerSuspensionBridge.requestOpen()}
      >
        {t("actions.create")}
      </Button>
    );
  }

  return (
    <Button size="small" variant="secondary" asChild>
      <Link to="create">{t("actions.create")}</Link>
    </Button>
  );
};

export const ProductListActions = ({ children }: { children?: ReactNode }) => {
  return (
    <div className="flex items-center justify-center gap-x-2">
      {Children.count(children) > 0 ? (
        children
      ) : (
        <>
          <ProductListCreateButton />
        </>
      )}
    </div>
  );
};

export const ProductListHeader = ({ children }: { children?: ReactNode }) => {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      {Children.count(children) > 0 ? (
        children
      ) : (
        <>
          <ProductListTitle />
          <ProductListActions />
        </>
      )}
    </div>
  );
};
