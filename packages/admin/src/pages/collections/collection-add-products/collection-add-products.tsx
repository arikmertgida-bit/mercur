
import { RouteFocusModal } from "../../../components/modals"
import { useCollection } from "../../../hooks/api/collections"
import { AddProductsToCollectionForm } from "./components/add-products-to-collection-form"
import { useRequiredParam } from "@mercurjs/dashboard-shared"
import { useTranslation } from "react-i18next"

export const CollectionAddProducts = () => {
  const { t } = useTranslation()
  const id = useRequiredParam("id")
  const { collection, isLoading, isError, error } = useCollection(id)

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("products.domain")}</span>
      </RouteFocusModal.Title>
      {!isLoading && collection && (
        <AddProductsToCollectionForm collection={collection} />
      )}
    </RouteFocusModal>
  )
}
