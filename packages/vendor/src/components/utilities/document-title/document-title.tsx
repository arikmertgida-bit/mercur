import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

export const DocumentTitle = () => {
  const { t } = useTranslation();

  return (
    <Helmet>
      <title>{t("app.documentTitle")}</title>
    </Helmet>
  );
};
