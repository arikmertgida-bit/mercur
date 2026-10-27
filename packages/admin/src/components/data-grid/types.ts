import type { JsonValue } from "@mercurjs/types"
import {
  CellContext,
  ColumnDef,
  Row,
  VisibilityState,
} from "@tanstack/react-table"
import React, { ReactNode, RefObject } from "react"
import { FieldErrors, FieldPath, FieldValues, UseFormReturn } from "react-hook-form"
import { z } from "zod"

export const DataGridColumnTypeSchema = z.enum([
  "text",
  "multiline-text",
  "number",
  "boolean",
  "togglable-number",
  "select",
])

export type DataGridColumnType = z.infer<typeof DataGridColumnTypeSchema>

/**
 * The grid addresses form values through runtime path strings (produced by
 * the column `field` callbacks), so internally it works on the form as a
 * record of JSON values.
 */
export type DataGridFormValues = Record<string, JsonValue>

export type DataGridForm = UseFormReturn<DataGridFormValues>

export type DataGridCoordinates = {
  row: number
  col: number
}

export interface DataGridCellProps<TData = JsonValue, TValue = JsonValue> {
  context: CellContext<TData, TValue>
}

export interface DataGridCellContext<TData = JsonValue, TValue = JsonValue>
  extends CellContext<TData, TValue> {
  /**
   * The index of the column in the grid.
   */
  columnIndex: number
  /**
   * The index of the row in the grid.
   */
  rowIndex: number
}

export type DataGridRowError = {
  message: string
  to: () => void
}

export type DataGridErrorRenderProps<TFieldValues extends FieldValues> = {
  errors: FieldErrors<TFieldValues>
  rowErrors: DataGridRowError[]
}

export interface DataGridCellRenderProps {
  container: DataGridCellContainerProps
  input: InputProps
}

type InputAttributes = {
  "data-row": number
  "data-col": number
  "data-cell-id": string
  "data-field": string
}

export interface InputProps {
  ref: RefObject<HTMLElement>
  onBlur: () => void
  onFocus: () => void
  onChange: (next: JsonValue, prev: JsonValue) => void
  "data-row": number
  "data-col": number
  "data-cell-id": string
  "data-field": string
}

type InnerAttributes = {
  "data-container-id": string
}

interface InnerProps {
  ref: RefObject<HTMLDivElement>
  onMouseOver: ((e: React.MouseEvent<HTMLElement>) => void) | undefined
  onMouseDown: ((e: React.MouseEvent<HTMLElement>) => void) | undefined
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
  onFocus: (e: React.FocusEvent<HTMLElement>) => void
  "data-container-id": string
}

interface OverlayProps {
  onMouseDown: (e: React.MouseEvent<HTMLElement>) => void
}

export interface DataGridCellContainerProps {
  children?: ReactNode
  field: string
  innerProps: InnerProps
  overlayProps: OverlayProps
  isAnchor: boolean
  isSelected: boolean
  isDragSelected: boolean
  placeholder?: ReactNode
  showOverlay: boolean
  outerComponent?: ReactNode
}

export type DataGridCellSnapshot = {
  field: string
  value: JsonValue
}

export type FieldContext<TData> = {
  row: Row<TData>
  column: ColumnDef<TData>
}

export type FieldFunction<TData, TFieldValues extends FieldValues> = (
  context: FieldContext<TData>
) => FieldPath<TFieldValues> | null

/**
 * The grid-specific entries `createDataGridHelper` stores in a column's
 * TanStack `meta`. TanStack's `ColumnMeta` is not generic over the form,
 * so the entries are validated when the grid reads them back.
 */
export const createDataGridColumnMetaSchema = <TData>() =>
  z.object({
    name: z.string().optional(),
    field: z
      .custom<(context: FieldContext<TData>) => string | null>(
        (value) => typeof value === "function"
      )
      .nullish(),
    type: DataGridColumnTypeSchema.optional(),
  })

export type GridCell = {
  field: string
  type: DataGridColumnType
  enabled: boolean
}

export type Grid = (GridCell | null)[][]

export type CellMetadata = {
  id: string
  field: string
  type: DataGridColumnType
  inputAttributes: InputAttributes
  innerAttributes: InnerAttributes
}

export type CellErrorMetadata = {
  field: string | null
  accessor: string | null
}

export type VisibilitySnapshot = {
  rows: VisibilityState
  columns: VisibilityState
}

export type GridColumnOption = {
  id: string
  name: string
  checked: boolean
  disabled: boolean
}

export const DataGridToggleableNumberSchema = z.object({
  quantity: z.union([z.number(), z.string()]),
  checked: z.boolean(),
  disabledToggle: z.boolean(),
})

export type DataGridToggleableNumber = z.infer<
  typeof DataGridToggleableNumberSchema
>

