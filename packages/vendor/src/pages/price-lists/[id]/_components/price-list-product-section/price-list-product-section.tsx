import {
  EllipsisHorizontal,
  ExclamationCircle,
  PencilSquare,
  Trash,
} from "@medusajs/icons"
import type { HttpTypes } from "@medusajs/types"
import {
  Button,
  Checkbox,
  Container,
  Heading,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import {
  ColumnDef,
  createColumnHelper,
  type RowSelectionState,
} from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import {
  DisplayExtensionZone,
  PermissionAction,
  SectionNoAccess,
  isForbidden,
} from "@mercurjs/dashboard-shared"
import type { PriceListProductGroupDTO } from "@mercurjs/types"

import { ActionMenu } from "@components/common/action-menu"
import { PlaceholderCell } from "@components/table/table-cells/common/placeholder-cell"
import {
  CategoryCell,
  CategoryHeader,
} from "@components/table/table-cells/product/category-cell/category-cell"
import {
  ProductCell,
  ProductHeader,
} from "@components/table/table-cells/product/product-cell"
import {
  ProductStatusCell,
  ProductStatusHeader,
} from "@components/table/table-cells/product/product-status-cell"
import { _DataTable, type Filter } from "@components/table/data-table"
import {
  usePriceListLinkProducts,
  usePriceListProducts,
} from "@hooks/api/price-lists"
import { useDataTable } from "@hooks/use-data-table"
import { useQueryParams } from "@hooks/use-query-params"

type PriceListProductSectionProps = {
  priceList: HttpTypes.AdminPriceList
}

const PAGE_SIZE = 10
const PREFIX = "plo"

export const PriceListProductSection = ({
  priceList,
}: PriceListProductSectionProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const prompt = usePrompt()

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const raw = useQueryParams(["q", "order", "offset"], PREFIX)

  const { products, count, isLoading, isError, error } = usePriceListProducts(
    priceList.id,
    {
      ...(raw.q ? { q: raw.q } : {}),
      ...(raw.order ? { order: raw.order } : {}),
      offset: raw.offset ? Number(raw.offset) : 0,
      limit: PAGE_SIZE,
    },
    { placeholderData: keepPreviousData }
  )

  const groupedProducts = products ?? []

  const columns = useColumns(priceList)
  const filters = useProductSectionFilters()
  const { mutateAsync } = usePriceListLinkProducts(priceList.id)

  const { table } = useDataTable({
    data: groupedProducts,
    count: count ?? 0,
    columns,
    enablePagination: true,
    enableRowSelection: true,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row.product_id,
    rowSelection: {
      state: rowSelection,
      updater: setRowSelection,
    },
    prefix: PREFIX,
  })

  const selectedProductIds = () => Object.keys(rowSelection)

  const handleDelete = async () => {
    const productIds = selectedProductIds()

    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("priceLists.products.delete.confirmation", {
        count: productIds.length,
      }),
      confirmText: t("actions.remove"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    mutateAsync(
      { remove: productIds },
      {
        onSuccess: () => {
          toast.success(
            t("priceLists.products.delete.successToast", {
              count: productIds.length,
            })
          )
          setRowSelection({})
        },
        onError: (e) => toast.error(e.message),
      }
    )
  }

  const handleEdit = async () => {
    const ids = selectedProductIds().join(",")
    navigate(`products/edit?ids[]=${ids}`)
  }

  return (
    <Container className="divide-y p-0" data-testid="price-list-product-section-container">
      <div className="flex items-center justify-between px-6 py-4" data-testid="price-list-product-section-header">
        <Heading data-testid="price-list-product-section-heading">
          {t("priceLists.products.header")}
        </Heading>
        <div className="flex items-center gap-x-2">
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    permission: "price_lists:edit",
                    label: t("priceLists.products.actions.editPrices"),
                    to: "products/edit",
                    icon: <PencilSquare />,
                    disabled: groupedProducts.length === 0,
                    disabledTooltip: t(
                      "priceLists.products.actions.editPricesDisabled"
                    ),
                  },
                ],
              },
            ]}
          >
            <Button
              size="small"
              variant="secondary"
              className="h-7 w-7 p-0"
              data-testid="price-list-product-section-action-menu-trigger"
            >
              <EllipsisHorizontal />
            </Button>
          </ActionMenu>
          <PermissionAction permission="price_lists:edit">
            <Button
              size="small"
              variant="secondary"
              asChild
              data-testid="price-list-product-section-add-button"
            >
              <Link to="products/add">{t("actions.add")}</Link>
            </Button>
          </PermissionAction>
        </div>
      </div>
      {isForbidden(error) ? (
        <SectionNoAccess />
      ) : isError ? (
        <div className="flex items-center gap-x-2 px-6 py-4" data-testid="price-list-product-section-error">
          <ExclamationCircle className="text-ui-fg-subtle" />
          <Text size="small" className="text-ui-fg-subtle">
            {error?.message || t("general.error")}
          </Text>
        </div>
      ) : (
        <_DataTable
          table={table}
          columns={columns}
          filters={filters}
          count={count ?? 0}
          pageSize={PAGE_SIZE}
          isLoading={isLoading}
          navigateTo={(row) => `/products/${row.original.product_id}`}
          orderBy={[
            { key: "created_at", label: t("fields.createdAt") },
            { key: "updated_at", label: t("fields.updatedAt") },
          ]}
          commands={[
            {
              action: handleEdit,
              label: t("priceLists.products.actions.editPrices"),
              shortcut: "e",
              permission: "price_lists:edit",
            },
            {
              action: handleDelete,
              label: t("actions.remove"),
              shortcut: "r",
              permission: "price_lists:edit",
            },
          ]}
          pagination
          search
          prefix={PREFIX}
          queryObject={raw}
        />
      )}
      <DisplayExtensionZone model="price_list" zone="products" data={priceList} />
    </Container>
  )
}

const useProductSectionFilters = (): Filter[] => {
  const { t } = useTranslation()
  return [
    { label: t("fields.createdAt"), key: "created_at", type: "date" },
    { label: t("fields.updatedAt"), key: "updated_at", type: "date" },
  ]
}

const ProductRowAction = ({
  group,
  priceList,
}: {
  group: PriceListProductGroupDTO
  priceList: HttpTypes.AdminPriceList
}) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const { mutateAsync } = usePriceListLinkProducts(priceList.id)

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("priceLists.products.delete.confirmation", { count: 1 }),
      confirmText: t("actions.remove"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    mutateAsync(
      { remove: [group.product_id] },
      {
        onSuccess: () => {
          toast.success(
            t("priceLists.products.delete.successToast", { count: 1 })
          )
        },
        onError: (e) => toast.error(e.message),
      }
    )
  }

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <PencilSquare />,
              permission: "price_lists:edit",
              label: t("priceLists.products.actions.editPrices"),
              to: `products/edit?ids[]=${group.product_id}`,
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              permission: "price_lists:edit",
              label: t("actions.remove"),
              onClick: handleDelete,
            },
          ],
        },
      ]}
    />
  )
}

const columnHelper = createColumnHelper<PriceListProductGroupDTO>()

const useColumns = (priceList: HttpTypes.AdminPriceList) => {
  const { t } = useTranslation()

  return useMemo<ColumnDef<PriceListProductGroupDTO>[]>(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      }),
      columnHelper.display({
        id: "product",
        header: () => <ProductHeader />,
        cell: ({ row }) => (
          <ProductCell
            product={{
              title: row.original.product.title,
              thumbnail: row.original.product.thumbnail ?? null,
            }}
          />
        ),
      }),
      columnHelper.display({
        id: "category",
        header: () => <CategoryHeader />,
        cell: ({ row }) => (
          <CategoryCell
            categories={(row.original.product.categories ?? undefined) as never}
          />
        ),
      }),
      columnHelper.display({
        id: "variants",
        header: () => (
          <div className="flex h-full w-full items-center">
            <span>{t("fields.variants")}</span>
          </div>
        ),
        cell: ({ row }) => {
          const count = row.original.variant_count
          if (!count) {
            return <PlaceholderCell />
          }
          return (
            <Text size="small" leading="compact" className="truncate">
              {t("priceLists.fields.variantsCount", { count })}
            </Text>
          )
        },
      }),
      columnHelper.display({
        id: "status",
        header: () => <ProductStatusHeader />,
        cell: ({ row }) => {
          const status = row.original.product.status
          if (!status) {
            return <PlaceholderCell />
          }
          return (
            <ProductStatusCell
              status={status as HttpTypes.AdminProductStatus}
            />
          )
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => (
          <ProductRowAction group={row.original} priceList={priceList} />
        ),
      }),
    ],
    [t, priceList]
  )
}
