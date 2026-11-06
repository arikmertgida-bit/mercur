import { Children, ReactNode } from "react"
import { useSearchParams } from "react-router-dom"

import { RouteFocusModal } from "../../../components/modals"
import { TabbedForm } from "../../../components/tabbed-form/tabbed-form"
import {
  CreateCategoryForm,
  CreateCategorySchemaType,
} from "./components/create-category-form"
import { CreateCategoryDetails } from "./components/create-category-form/create-category-details"
import { CreateCategoryNesting } from "./components/create-category-form/create-category-nesting"
import { CreateCategorySchema } from "./components/create-category-form/schema"
import { useTranslation } from "react-i18next"

const Root = ({ children }: { children?: ReactNode }) => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const parentCategoryId = searchParams.get("parent_category_id")

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("categories.create.header")}</span>
      </RouteFocusModal.Title>
      {Children.count(children) > 0 ? (
        children
      ) : (
        <CreateCategoryForm parentCategoryId={parentCategoryId} />
      )}
    </RouteFocusModal>
  )
}

export const CategoryCreatePage = Object.assign(Root, {
  Form: CreateCategoryForm,
  DetailsTab: CreateCategoryDetails,
  OrganizeTab: CreateCategoryNesting,
  Tab: TabbedForm.Tab,
})

export type { CreateCategorySchemaType }
export { CreateCategorySchema }

// Keep backward-compatible named export for route `Component`
export const CategoryCreate = Root
