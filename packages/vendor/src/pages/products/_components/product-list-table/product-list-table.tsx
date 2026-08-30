import { Children, ReactNode } from "react"
import { Container } from "@medusajs/ui"

import { ProductListHeader } from "./product-list-header"
import { ProductListDataTable } from "./product-list-data-table"

export const ProductListTable = ({ children }: { children?: ReactNode }) => {
  return (
    <Container className="divide-y p-0">
      {Children.count(children) > 0 ? (
        children
      ) : (
        <>
          <ProductListHeader />
          <ProductListDataTable />
        </>
      )}
    </Container>
  )
}
