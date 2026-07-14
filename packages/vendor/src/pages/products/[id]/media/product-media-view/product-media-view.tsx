import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { EditProductMediaForm } from "../edit-product-media-form"
import { ProductMediaGallery } from "../product-media-gallery"
import { ProductMediaViewContext } from "./product-media-view-context"
import { ExtendedAdminProduct } from "@custom-types/products"

type ProductMediaViewProps = {
  product: ExtendedAdminProduct
}

enum View {
  GALLERY = "gallery",
  EDIT = "edit",
}

const getView = (searchParams: URLSearchParams) => {
  const view = searchParams.get("view")
  if (view === View.EDIT) {
    return View.EDIT
  }

  return View.GALLERY
}

export const ProductMediaView = ({ product }: ProductMediaViewProps) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = getView(searchParams)

  const goToGallery = useCallback(() => {
    setSearchParams({ view: View.GALLERY })
  }, [setSearchParams])

  const goToEdit = useCallback(() => {
    setSearchParams({ view: View.EDIT })
  }, [setSearchParams])

  const contextValue = useMemo(
    () => ({ goToGallery, goToEdit }),
    [goToGallery, goToEdit],
  )

  return (
    <ProductMediaViewContext.Provider value={contextValue}>
      {renderView(view, product)}
    </ProductMediaViewContext.Provider>
  )
}

const renderView = (view: View, product: ExtendedAdminProduct) => {
  switch (view) {
    case View.GALLERY:
      return <ProductMediaGallery product={product} />
    case View.EDIT:
      return <EditProductMediaForm product={product} />
  }
}
