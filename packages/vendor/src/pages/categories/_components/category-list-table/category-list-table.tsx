import { Children, ReactNode } from "react";
import { Container } from "@medusajs/ui";

import { CategoryListHeader } from "./category-list-header";
import { CategoryListDataTable } from "./category-list-data-table";

export const CategoryListTable = ({ children }: { children?: ReactNode }) => {
  return (
    <Container className="divide-y p-0">
      {Children.count(children) > 0 ? (
        children
      ) : (
        <>
          <CategoryListHeader />
          <CategoryListDataTable />
        </>
      )}
    </Container>
  );
};
