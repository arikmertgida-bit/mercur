import { createTable, getCoreRowModel } from "@tanstack/react-table"
import { describe, expect, it } from "vitest"

import { createDataGridHelper } from "../helpers/create-data-grid-column-helper"
import { getCellError } from "../hooks/use-data-grid-cell-error"
import { DataGridMatrix } from "../models/data-grid-matrix"

type VariantRow = { index: number }

type ProductForm = {
  shipping_profile_id: string
  variants: { ean: string; prices: Record<string, number | ""> }[]
}

const helper = createDataGridHelper<VariantRow, ProductForm>()

const columns = [
  helper.column({
    id: "ean",
    header: "EAN",
    cell: () => null,
    field: (context) => `variants.${context.row.original.index}.ean`,
    type: "text",
  }),
  helper.column({
    id: "shipping_profile",
    header: "Shipping profile",
    cell: () => null,
    field: () => "shipping_profile_id",
    sharedAcrossRows: true,
    type: "select",
  }),
  helper.column({
    id: "currency_prices.try",
    header: "TRY",
    cell: () => null,
    field: (context) => `variants.${context.row.original.index}.prices.try`,
    type: "number",
  }),
]

const buildMatrix = (rowCount: number): DataGridMatrix<VariantRow> => {
  const table = createTable<VariantRow>({
    data: Array.from({ length: rowCount }, (_, index) => ({ index })),
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {},
    onStateChange: () => {},
    renderFallbackValue: null,
  })

  return new DataGridMatrix(table.getRowModel().rows, columns)
}

describe("DataGridMatrix with a column shared across rows", () => {
  it.each([1, 3])(
    "keeps the variant row accessor with %i row(s)",
    (rowCount) => {
      const matrix = buildMatrix(rowCount)

      expect(matrix.rowAccessors).toEqual(
        Array.from({ length: rowCount }, (_, index) => `variants.${index}`)
      )
      expect(matrix.columnAccessors).toEqual([
        "ean",
        "shipping_profile_id",
        "prices.try",
      ])
    }
  )

  it("finds row cells, parent-path errors and the shared cell", () => {
    const matrix = buildMatrix(3)

    expect(matrix.getCoordinatesByField("variants.1.ean")).toEqual({
      row: 1,
      col: 0,
    })
    expect(matrix.getCoordinatesByField("variants.2.prices")).toEqual({
      row: 2,
      col: 2,
    })
    expect(matrix.getCoordinatesByField("shipping_profile_id")).toEqual({
      row: 0,
      col: 1,
    })
  })
})

describe("getCellError", () => {
  const errors = {
    variants: [
      {
        prices: { type: "custom", message: "Enter a price" },
      },
    ],
  }

  it("shows a parent-path error on each cell under it", () => {
    expect(getCellError(errors, "variants.0.prices.try", "variants.0")).toEqual(
      { type: "custom", message: "Enter a price" }
    )
  })

  it("does not spread a row error to unrelated cells", () => {
    expect(getCellError(errors, "variants.0.ean", "variants.0")).toBeUndefined()
  })

  it("never climbs above the row", () => {
    const rowLevel = { variants: { type: "custom", message: "Pick one" } }

    expect(
      getCellError(rowLevel, "variants.0.prices.try", "variants.0")
    ).toBeUndefined()
  })
})
