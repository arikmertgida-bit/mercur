import type { JsonValue } from "@mercurjs/types"
import { FocusEvent, MouseEvent, createContext } from "react"
import { Control, FieldErrors, UseFormRegister } from "react-hook-form"
import {
  CellErrorMetadata,
  CellMetadata,
  DataGridCoordinates,
  DataGridFormValues,
} from "../types"

export type DataGridContextValue = {
  // Grid state
  anchor: DataGridCoordinates | null
  trapActive: boolean
  setTrapActive: (value: boolean) => void
  /**
   * Errors are only read by runtime path (`get(errors, field)`), so they
   * are kept as RHF's untyped error tree.
   */
  errors: FieldErrors
  // Cell handlers
  getIsCellSelected: (coords: DataGridCoordinates) => boolean
  getIsCellDragSelected: (coords: DataGridCoordinates) => boolean
  // Grid handlers
  setIsEditing: (value: boolean) => void
  setIsSelecting: (value: boolean) => void
  setRangeEnd: (coords: DataGridCoordinates) => void
  setSingleRange: (coords: DataGridCoordinates) => void
  // Form state and handlers
  register: UseFormRegister<DataGridFormValues>
  control: Control<DataGridFormValues>
  getInputChangeHandler: (
    field: string
  ) => (next: JsonValue, prev: JsonValue) => void
  // Wrapper handlers
  getWrapperFocusHandler: (
    coordinates: DataGridCoordinates
  ) => (e: FocusEvent<HTMLElement>) => void
  getWrapperMouseOverHandler: (
    coordinates: DataGridCoordinates
  ) => ((e: MouseEvent<HTMLElement>) => void) | undefined
  getCellMetadata: (coords: DataGridCoordinates) => CellMetadata
  getCellErrorMetadata: (coords: DataGridCoordinates) => CellErrorMetadata
  navigateToField: (field: string) => void
}

export const DataGridContext =
  createContext<DataGridContextValue | null>(null)
