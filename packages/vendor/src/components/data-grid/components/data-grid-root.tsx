import {
  Adjustments,
  AdjustmentsDone,
  ExclamationCircle,
} from "@medusajs/icons"
import { Button, DropdownMenu, clx } from "@medusajs/ui"
import {
  Column,
  ColumnDef,
  HeaderGroup,
  Row,
  VisibilityState,
  defaultColumnSizing,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  VirtualItem,
  Virtualizer,
  useVirtualizer,
} from "@tanstack/react-virtual"
import React, {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { FieldErrors, FieldValues, UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { useCommandHistory } from "../../../hooks/use-command-history"
import { useDocumentDirection } from "../../../hooks/use-document-direction"
import { ConditionalTooltip } from "../../common/conditional-tooltip"
import { DataGridContext, type DataGridContextValue } from "../context"
import {
  useDataGridCellHandlers,
  useDataGridCellMetadata,
  useDataGridCellSnapshot,
  useDataGridClipboardEvents,
  useDataGridColumnVisibility,
  useDataGridErrorHighlighting,
  useDataGridFormHandlers,
  useDataGridKeydownEvent,
  useDataGridMouseUpEvent,
  useDataGridNavigation,
  useDataGridQueryTool,
} from "../hooks"
import { DataGridMatrix } from "../models"
import { DataGridCoordinates, DataGridForm, GridColumnOption } from "../types"
import { isCellMatch, isSpecialFocusKey } from "../utils"
import { DataGridKeyboardShortcutModal } from "./data-grid-keyboard-shortcut-modal"
export interface DataGridRootProps<
  TData,
  TFieldValues extends FieldValues = FieldValues
> {
  data?: TData[]
  columns: ColumnDef<TData>[]
  state: UseFormReturn<TFieldValues>
  getSubRows?: (row: TData) => TData[] | undefined
  onEditingChange?: (isEditing: boolean) => void
  disableInteractions?: boolean
  multiColumnSelection?: boolean
  showColumnsDropdown?: boolean
  /**
   * Custom content to render in the header, positioned between the column visibility
   * controls and the error/shortcuts section.
   */
  headerContent?: ReactNode
  /**
   * Lazy loading props - when totalRowCount is provided, the grid enters lazy loading mode.
   * In this mode, the virtualizer will size based on totalRowCount and trigger onFetchMore
   * when the user scrolls near the end of loaded data.
   */
  /** Total count of rows for scroll sizing (enables lazy loading mode when provided) */
  totalRowCount?: number
  /** Called when more data should be fetched */
  onFetchMore?: () => void
  /** Whether more data is currently being fetched */
  isFetchingMore?: boolean
  /** Whether there is more data to fetch */
  hasNextPage?: boolean
}

const ROW_HEIGHT = 40
const EMPTY_DATA: never[] = []

/**
 * Widens the caller's form to the grid's path-addressed view of it. The grid
 * only reaches form values through the runtime path strings returned by the
 * column `field` callbacks, and treats the values they address as the JSON
 * primitives/objects its cells edit.
 */
function toDataGridForm<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>
): DataGridForm {
  // @ts-expect-error -- react-hook-form boundary: UseFormReturn (Control, register, setValue, ...) is invariant in its field-values type, so a concrete form cannot be widened to the record view the grid addresses by runtime path.
  return form
}

const getCommonPinningStyles = <TData,>(
  column: Column<TData>
): CSSProperties => {
  const isPinned = column.getIsPinned()

  /**
   * Since our border colors are semi-transparent, we need to set a custom border color
   * that looks the same as the actual border color, but has 100% opacity.
   *
   * We do this by checking if the current theme is dark mode, and then setting the border color
   * to the corresponding color.
   */
  const isDarkMode = document.documentElement.classList.contains("dark")
  const BORDER_COLOR = isDarkMode ? "rgb(50,50,53)" : "rgb(228,228,231)"

  return {
    position: isPinned ? "sticky" : "relative",
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
    borderBottom: isPinned ? `1px solid ${BORDER_COLOR}` : undefined,
    borderInlineEnd: isPinned ? `1px solid ${BORDER_COLOR}` : undefined,
    // TanStack's "left"/"right" pins are the grid's start/end; logical insets keep them in RTL.
    insetInlineStart:
      isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    insetInlineEnd:
      isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
  }
}

/** Gap before a virtual column when the columns in between are not rendered. */
const getColumnGap = (
  previous: VirtualItem | undefined,
  current: VirtualItem
): number | undefined => {
  if (!previous || current.index === previous.index + 1) {
    return undefined
  }

  return current.start - previous.end
}

/** Space for the virtualized columns outside the rendered range. */
const getRowPaddingStyles = (
  paddingStart: number | undefined,
  paddingEnd: number | undefined
): CSSProperties => ({
  paddingInlineStart: paddingStart || undefined,
  paddingInlineEnd: paddingEnd || undefined,
})

const COLUMN_RESIZE_STEP = 10
const COLUMN_RESIZER_ATTRIBUTE = "data-column-resizer"

type ReadingDirection = "ltr" | "rtl"

/** Alt+Shift+ArrowLeft/Right on a cell resizes its column (keyboard path for the mouse-only handle). */
const isColumnResizeShortcut = (e: KeyboardEvent): boolean =>
  e.altKey &&
  e.shiftKey &&
  !e.ctrlKey &&
  !e.metaKey &&
  (e.key === "ArrowLeft" || e.key === "ArrowRight")

const isColumnResizerTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  target.closest(`[${COLUMN_RESIZER_ATTRIBUTE}]`) !== null

const getColumnSizeBounds = <TData,>(
  column: Column<TData>
): { min: number; max: number } => ({
  min: column.columnDef.minSize ?? defaultColumnSizing.minSize,
  max: column.columnDef.maxSize ?? defaultColumnSizing.maxSize,
})

/** The handle sits on the column's end edge, so the arrow pointing past it widens the column. */
const getArrowResizeDelta = (
  key: string,
  direction: ReadingDirection
): number => {
  const widenKey = direction === "rtl" ? "ArrowLeft" : "ArrowRight"
  return key === widenKey ? COLUMN_RESIZE_STEP : -COLUMN_RESIZE_STEP
}

/**
 * TODO:
 * - [Minor] Extend the commands to also support modifying the anchor and rangeEnd, to restore the previous focus after undo/redo.
 */

export const DataGridRoot = <
  TData,
  TFieldValues extends FieldValues = FieldValues
>({
  data = EMPTY_DATA,
  columns,
  state,
  getSubRows,
  onEditingChange,
  disableInteractions,
  multiColumnSelection = false,
  showColumnsDropdown = true,
  totalRowCount,
  onFetchMore,
  isFetchingMore,
  hasNextPage,
  headerContent,
}: DataGridRootProps<TData, TFieldValues>) => {
  // TODO: remove once everything is lazy loaded
  const isLazyMode = totalRowCount !== undefined
  const containerRef = useRef<HTMLDivElement>(null)

  const { redo, undo, execute } = useCommandHistory()
  const form = toDataGridForm(state)
  const {
    register,
    control,
    getValues,
    setValue,
  } = form
  const errors: FieldErrors = state.formState.errors

  const [internalTrapActive, setTrapActive] = useState(true)

  const trapActive = !disableInteractions && internalTrapActive

  const [anchor, setAnchor] = useState<DataGridCoordinates | null>(null)
  const [rangeEnd, setRangeEnd] = useState<DataGridCoordinates | null>(null)
  const [dragEnd, setDragEnd] = useState<DataGridCoordinates | null>(null)

  const [isSelecting, setIsSelecting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const [isEditing, setIsEditing] = useState(false)

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowVisibility, setRowVisibility] = useState<VisibilityState>({})

  const direction: ReadingDirection = useDocumentDirection() ?? "ltr"

  const grid = useReactTable({
    data: data,
    columns,
    initialState: {
      columnPinning: {
        left: columns[0]?.id ? [columns[0].id] : [],
      },
    },
    state: {
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
    getSubRows,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
    columnResizeDirection: direction,
    defaultColumn: {
      size: 200,
      // Header cells have 32px padding + a 1px border; anything narrower splits headers from their cells.
      minSize: 60,
      maxSize: 400,
    },
  })

  const { flatRows } = grid.getRowModel()
  const flatColumns = grid.getAllFlatColumns()

  const visibleRows = useMemo(
    () => flatRows.filter((_, index) => rowVisibility?.[index] !== false),
    [flatRows, rowVisibility]
  )
  const visibleColumns = grid.getVisibleLeafColumns()

  const effectiveRowCount = totalRowCount ?? visibleRows.length

  const rowVirtualizer = useVirtualizer({
    count: effectiveRowCount,
    estimateSize: () => ROW_HEIGHT,
    getScrollElement: () => containerRef.current,
    // Measure actual row heights for dynamic sizing (disabled in Firefox due to measurement issues). Taken from Tanstack
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 5,
    rangeExtractor: (range) => {
      const toRender = new Set(
        Array.from(
          { length: range.endIndex - range.startIndex + 1 },
          (_, i) => range.startIndex + i
        )
      )

      if (anchor && visibleRows[anchor.row]) {
        toRender.add(anchor.row)
      }

      if (rangeEnd && visibleRows[rangeEnd.row]) {
        toRender.add(rangeEnd.row)
      }

      return Array.from(toRender).sort((a, b) => a - b)
    },
  })
  const virtualRows = rowVirtualizer.getVirtualItems()

  /**
   * Lazy loading scroll detection.
   * When the user scrolls near the end of loaded data, trigger onFetchMore.
   * We use refs to get latest values in the scroll handler without re-attaching.
   */
  const lazyLoadingRefs = useRef({
    onFetchMore,
    hasNextPage,
    isFetchingMore,
    loadedRowCount: visibleRows.length,
  })

  // Keep refs updated
  useEffect(() => {
    lazyLoadingRefs.current = {
      onFetchMore,
      hasNextPage,
      isFetchingMore,
      loadedRowCount: visibleRows.length,
    }
  }, [onFetchMore, hasNextPage, isFetchingMore, visibleRows.length])

  const hasData = visibleRows.length > 0

  const handleScroll = useCallback(() => {
    const { onFetchMore, hasNextPage, isFetchingMore, loadedRowCount } =
      lazyLoadingRefs.current

    if (!onFetchMore || !hasNextPage || isFetchingMore) {
      return
    }

    const scrollElement = containerRef.current

    if (!scrollElement) {
      return
    }

    const { scrollTop, clientHeight } = scrollElement
    const loadedHeight = loadedRowCount * ROW_HEIGHT
    const viewportBottom = scrollTop + clientHeight
    const fetchThreshold = loadedHeight - ROW_HEIGHT * 10

    if (viewportBottom >= fetchThreshold) {
      onFetchMore()
    }
  }, [lazyLoadingRefs, containerRef])

  useEffect(() => {
    if (!isLazyMode || !hasData) {
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    const timeoutId = setTimeout(() => {
      const scrollElement: HTMLElement | null = containerRef.current
      if (!scrollElement) {
        return
      }

      scrollElement.addEventListener("scroll", handleScroll)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      container.removeEventListener("scroll", handleScroll)
    }
  }, [
	isLazyMode,
	hasData,
	handleScroll
])

  const columnVirtualizer = useVirtualizer({
    count: visibleColumns.length,
    estimateSize: (index) => visibleColumns[index].getSize(),
    getScrollElement: () => containerRef.current,
    horizontal: true,
    isRtl: direction === "rtl",
    overscan: 3,
    rangeExtractor: (range) => {
      const startIndex = range.startIndex
      const endIndex = range.endIndex

      const toRender = new Set(
        Array.from(
          { length: endIndex - startIndex + 1 },
          (_, i) => startIndex + i
        )
      )

      if (anchor && visibleColumns[anchor.col]) {
        toRender.add(anchor.col)
      }

      if (rangeEnd && visibleColumns[rangeEnd.col]) {
        toRender.add(rangeEnd.col)
      }

      // The first column is pinned, so we always render it
      toRender.add(0)

      return Array.from(toRender).sort((a, b) => a - b)
    },
  })
  const virtualColumns = columnVirtualizer.getVirtualItems()

  // The column virtualizer caches sizes from getSize(); re-measure when a resize changes them.
  const columnSizing = grid.getState().columnSizing
  useEffect(() => {
    columnVirtualizer.measure()
  }, [columnSizing, columnVirtualizer])

  let virtualPaddingLeft: number | undefined
  let virtualPaddingRight: number | undefined

  if (columnVirtualizer && virtualColumns?.length) {
    virtualPaddingLeft = virtualColumns[0]?.start ?? 0
    virtualPaddingRight =
      columnVirtualizer.getTotalSize() -
      (virtualColumns[virtualColumns.length - 1]?.end ?? 0)
  }

  const matrix = useMemo(
    () =>
      new DataGridMatrix<TData>(flatRows, columns, multiColumnSelection),
    [flatRows, columns, multiColumnSelection]
  )
  const queryTool = useDataGridQueryTool(containerRef)

  const setSingleRange = useCallback(
    (coordinates: DataGridCoordinates | null) => {
      setAnchor(coordinates)
      setRangeEnd(coordinates)
    },
    []
  )

  const { errorCount, isHighlighted, toggleErrorHighlighting } =
    useDataGridErrorHighlighting(matrix, grid, errors)

  const handleToggleErrorHighlighting = useCallback(() => {
    toggleErrorHighlighting(
      rowVisibility,
      columnVisibility,
      setRowVisibility,
      setColumnVisibility
    )
  }, [toggleErrorHighlighting, rowVisibility, columnVisibility])

  const {
    columnOptions,
    handleToggleColumn,
    handleResetColumns,
    isDisabled: isColumsDisabled,
  } = useDataGridColumnVisibility(grid, matrix)

  const handleToggleColumnVisibility = useCallback(
    (index: number) => {
      return handleToggleColumn(index)
    },
    [handleToggleColumn]
  )

  const { navigateToField, scrollToCoordinates } = useDataGridNavigation({
    matrix,
    queryTool,
    anchor,
    columnVirtualizer,
    rowVirtualizer,
    flatColumns,
    setColumnVisibility,
    setSingleRange,
    visibleColumns,
    visibleRows,
  })

  const { createSnapshot, restoreSnapshot } = useDataGridCellSnapshot({
    matrix,
    form,
  })

  const onEditingChangeHandler = useCallback(
    (value: boolean) => {
      if (onEditingChange) {
        onEditingChange(value)
      }

      if (value) {
        createSnapshot(anchor)
      }

      setIsEditing(value)
    },
    [anchor, createSnapshot, onEditingChange]
  )

  const { getSelectionValues, setSelectionValues } = useDataGridFormHandlers({
    matrix,
    form,
    anchor,
  })

  const { handleKeyDownEvent, handleSpecialFocusKeys } =
    useDataGridKeydownEvent({
      containerRef,
      direction,
      matrix,
      queryTool,
      anchor,
      rangeEnd,
      isEditing,
      setTrapActive,
      setRangeEnd,
      getSelectionValues,
      getValues,
      setSelectionValues,
      onEditingChangeHandler,
      restoreSnapshot,
      createSnapshot,
      setSingleRange,
      scrollToCoordinates,
      execute,
      undo,
      redo,
      setValue,
    })

  const { handleMouseUpEvent } = useDataGridMouseUpEvent({
    matrix,
    anchor,
    dragEnd,
    setDragEnd,
    isDragging,
    setIsDragging,
    setRangeEnd,
    setIsSelecting,
    getSelectionValues,
    setSelectionValues,
    execute,
  })

  const { handleCopyEvent, handlePasteEvent } = useDataGridClipboardEvents({
    matrix,
    isEditing,
    anchor,
    rangeEnd,
    getSelectionValues,
    setSelectionValues,
    execute,
  })

  const {
    getWrapperFocusHandler,
    getInputChangeHandler,
    getOverlayMouseDownHandler,
    getWrapperMouseOverHandler,
    getIsCellDragSelected,
    getIsCellSelected,
    onDragToFillStart,
  } = useDataGridCellHandlers({
    matrix,
    anchor,
    rangeEnd,
    setRangeEnd,
    isDragging,
    setIsDragging,
    isSelecting,
    setIsSelecting,
    setSingleRange,
    dragEnd,
    setDragEnd,
    setValue,
    execute,
    multiColumnSelection,
  })

  const { getCellErrorMetadata, getCellMetadata } = useDataGridCellMetadata({
    matrix,
  })

  const resizeColumn = useCallback(
    (column: Column<TData>, size: number) => {
      const { min, max } = getColumnSizeBounds(column)
      const next = Math.min(max, Math.max(min, size))

      grid.setColumnSizing((sizing) => ({ ...sizing, [column.id]: next }))
    },
    [grid]
  )

  const focusAnchorColumnResizer = useCallback(
    (e: KeyboardEvent) => {
      const column = anchor ? flatColumns[anchor.col] : undefined

      if (!column?.getCanResize()) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      resizeColumn(
        column,
        column.getSize() + getArrowResizeDelta(e.key, direction)
      )

      const resizers = containerRef.current?.querySelectorAll<HTMLElement>(
        `[${COLUMN_RESIZER_ATTRIBUTE}]`
      )

      Array.from(resizers ?? [])
        .find(
          (resizer) =>
            resizer.getAttribute(COLUMN_RESIZER_ATTRIBUTE) === column.id
        )
        ?.focus()
    },
    [anchor, flatColumns, resizeColumn, direction]
  )

  const handleGridKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isColumnResizeShortcut(e) && !isEditing) {
        focusAnchorColumnResizer(e)
        return
      }

      handleKeyDownEvent(e)
    },
    [isEditing, focusAnchorColumnResizer, handleKeyDownEvent]
  )

  /** Effects */

  /**
   * Register all handlers for the grid.
   */
  useEffect(() => {
    if (!trapActive) {
      return
    }

    window.addEventListener("keydown", handleGridKeyDown)
    window.addEventListener("mouseup", handleMouseUpEvent)

    // Copy and paste event listeners need to be added to the window
    window.addEventListener("copy", handleCopyEvent)
    window.addEventListener("paste", handlePasteEvent)

    return () => {
      window.removeEventListener("keydown", handleGridKeyDown)
      window.removeEventListener("mouseup", handleMouseUpEvent)

      window.removeEventListener("copy", handleCopyEvent)
      window.removeEventListener("paste", handlePasteEvent)
    }
  }, [
    trapActive,
    handleGridKeyDown,
    handleMouseUpEvent,
    handleCopyEvent,
    handlePasteEvent,
  ])

  useEffect(() => {
    const specialFocusHandler = (e: KeyboardEvent) => {
      if (isSpecialFocusKey(e)) {
        handleSpecialFocusKeys(e)
        return
      }
    }

    window.addEventListener("keydown", specialFocusHandler)

    return () => {
      window.removeEventListener("keydown", specialFocusHandler)
    }
  }, [handleSpecialFocusKeys])

  const handleHeaderInteractionChange = useCallback((isActive: boolean) => {
    if (isActive) {
      setTrapActive(false)
    }
  }, [])

  /**
   * Auto corrective effect for ensuring we always
   * have a range end.
   */
  useEffect(() => {
    if (!anchor) {
      return
    }

    if (rangeEnd) {
      return
    }

    setRangeEnd(anchor)
  }, [anchor, rangeEnd])

  /**
   * Ensure that we set a anchor on first render.
   */
  useEffect(() => {
    if (!anchor && matrix) {
      const coords = matrix.getFirstNavigableCell()

      if (coords) {
        setSingleRange(coords)
      }
    }
  }, [anchor, matrix, setSingleRange])

  const values = useMemo<DataGridContextValue>(
    () => ({
      anchor,
      control,
      trapActive,
      errors,
      setTrapActive,
      setIsSelecting,
      setIsEditing: onEditingChangeHandler,
      setSingleRange,
      setRangeEnd,
      getWrapperFocusHandler,
      getInputChangeHandler,
      getOverlayMouseDownHandler,
      getWrapperMouseOverHandler,
      register,
      getIsCellSelected,
      getIsCellDragSelected,
      getCellMetadata,
      getCellErrorMetadata,
      navigateToField,
    }),
    [
      anchor,
      control,
      trapActive,
      errors,
      setTrapActive,
      setIsSelecting,
      onEditingChangeHandler,
      setSingleRange,
      setRangeEnd,
      getWrapperFocusHandler,
      getInputChangeHandler,
      getOverlayMouseDownHandler,
      getWrapperMouseOverHandler,
      register,
      getIsCellSelected,
      getIsCellDragSelected,
      getCellMetadata,
      getCellErrorMetadata,
      navigateToField,
    ]
  )

  const handleRestoreGridFocus = useCallback(() => {
    if (anchor && !trapActive) {
      setTrapActive(true)

      setSingleRange(anchor)
      scrollToCoordinates(anchor, "both")

      requestAnimationFrame(() => {
        queryTool?.getContainer(anchor)?.focus()
      })
    }
  }, [anchor, trapActive, setSingleRange, scrollToCoordinates, queryTool])

  /** Focus, clicks and keys on a column resizer stay with the resizer. */
  const handleGridInteraction = useCallback(
    (e: React.SyntheticEvent<HTMLTableElement>) => {
      if (isColumnResizerTarget(e.target)) {
        return
      }

      handleRestoreGridFocus()
    },
    [handleRestoreGridFocus]
  )

  const handleColumnResizerFocus = useCallback(() => {
    setTrapActive(false)
  }, [])

  const headerGroups = grid.getHeaderGroups()

  return (
    <DataGridContext.Provider value={values}>
      <div className="bg-ui-bg-subtle flex size-full flex-col">
        <DataGridHeader
          showColumnsDropdown={showColumnsDropdown}
          columnOptions={columnOptions}
          isDisabled={isColumsDisabled}
          onToggleColumn={handleToggleColumnVisibility}
          errorCount={errorCount}
          onToggleErrorHighlighting={handleToggleErrorHighlighting}
          onResetColumns={handleResetColumns}
          isHighlighted={isHighlighted}
          onHeaderInteractionChange={handleHeaderInteractionChange}
          headerContent={headerContent}
        />
        <div className="size-full overflow-hidden">
          <div
            ref={containerRef}
            className="relative h-full select-none overflow-auto outline-none"
            data-container={true}
          >
            <table
              role="grid"
              tabIndex={0}
              aria-rowcount={headerGroups.length + effectiveRowCount}
              aria-colcount={visibleColumns.length}
              onFocus={handleGridInteraction}
              onClick={handleGridInteraction}
              onKeyDown={handleGridInteraction}
              className="text-ui-fg-subtle grid outline-none"
            >
              <thead className="txt-compact-small-plus bg-ui-bg-subtle sticky top-0 z-[1] grid">
                {headerGroups.map((headerGroup, headerGroupIndex) => (
                  <tr
                    key={headerGroup.id}
                    aria-rowindex={headerGroupIndex + 1}
                    className="flex h-10 w-full"
                    style={getRowPaddingStyles(
                      virtualPaddingLeft,
                      virtualPaddingRight
                    )}
                  >
                    {virtualColumns.map((vc, index, array) => {
                      const header = headerGroup.headers[vc.index]

                      return (
                        <DataGridHeaderCell
                          key={header.id}
                          header={header}
                          columnIndex={vc.index}
                          gapBefore={getColumnGap(array[index - 1], vc)}
                          direction={direction}
                          onResize={resizeColumn}
                          onResizerFocus={handleColumnResizerFocus}
                          onResizerExit={handleRestoreGridFocus}
                        />
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody
                className="relative grid"
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                }}
              >
                {virtualRows.map((virtualRow) => {
                  const row: Row<TData> | undefined =
                    visibleRows[virtualRow.index]
                  const ariaRowIndex =
                    headerGroups.length + virtualRow.index + 1

                  // In lazy mode, rows beyond loaded data show as skeleton
                  if (!row) {
                    return (
                      <DataGridRowSkeleton
                        key={`skeleton-${virtualRow.index}`}
                        ariaRowIndex={ariaRowIndex}
                        virtualRow={virtualRow}
                        virtualColumns={virtualColumns}
                        virtualPaddingLeft={virtualPaddingLeft}
                        virtualPaddingRight={virtualPaddingRight}
                      />
                    )
                  }

                  const rowIndex = flatRows.findIndex((r) => r.id === row.id)

                  return (
                    <DataGridRow
                      key={row.id}
                      row={row}
                      rowIndex={rowIndex}
                      ariaRowIndex={ariaRowIndex}
                      virtualRow={virtualRow}
                      rowVirtualizer={rowVirtualizer}
                      flatColumns={flatColumns}
                      virtualColumns={virtualColumns}
                      anchor={anchor}
                      virtualPaddingLeft={virtualPaddingLeft}
                      virtualPaddingRight={virtualPaddingRight}
                      onDragToFillStart={onDragToFillStart}
                      multiColumnSelection={multiColumnSelection}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DataGridContext.Provider>
  )
}

type DataGridHeaderProps = {
  columnOptions: GridColumnOption[]
  isDisabled: boolean
  showColumnsDropdown: boolean
  onToggleColumn: (index: number) => (value: boolean) => void
  onResetColumns: () => void
  isHighlighted: boolean
  errorCount: number
  onToggleErrorHighlighting: () => void
  onHeaderInteractionChange: (isActive: boolean) => void
  headerContent?: ReactNode
}

const DataGridHeader = ({
  columnOptions,
  isDisabled,
  onToggleColumn,
  onResetColumns,
  isHighlighted,
  errorCount,
  onToggleErrorHighlighting,
  onHeaderInteractionChange,
  showColumnsDropdown,
  headerContent,
}: DataGridHeaderProps) => {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const { t } = useTranslation()
  const direction = useDocumentDirection()

  // Since all columns are checked by default, we can check if any column is unchecked
  const hasChanged = columnOptions.some((column) => !column.checked)

  const handleShortcutsOpenChange = (value: boolean) => {
    onHeaderInteractionChange(value)
    setShortcutsOpen(value)
  }

  const handleColumnsOpenChange = (value: boolean) => {
    onHeaderInteractionChange(value)
    setColumnsOpen(value)
  }
  return (
    <div className="bg-ui-bg-base flex items-center justify-between border-b p-4">
      {showColumnsDropdown && (
        <div className="flex items-center gap-x-2">
          <DropdownMenu
            dir={direction}
            open={columnsOpen}
            onOpenChange={handleColumnsOpenChange}
          >
            <ConditionalTooltip
              showTooltip={isDisabled}
              content={t("dataGrid.columns.disabled")}
            >
              <DropdownMenu.Trigger asChild disabled={isDisabled}>
                <Button size="small" variant="secondary">
                  {hasChanged ? <AdjustmentsDone /> : <Adjustments />}
                  {t("dataGrid.columns.view")}
                </Button>
              </DropdownMenu.Trigger>
            </ConditionalTooltip>
            <DropdownMenu.Content>
              {columnOptions.map((column, index) => {
                const { checked, disabled, id, name } = column

                if (disabled) {
                  return null
                }

                return (
                  <DropdownMenu.CheckboxItem
                    key={id}
                    checked={checked}
                    onCheckedChange={onToggleColumn(index)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {name}
                  </DropdownMenu.CheckboxItem>
                )
              })}
            </DropdownMenu.Content>
          </DropdownMenu>
          {hasChanged && (
            <Button
              size="small"
              variant="transparent"
              type="button"
              onClick={onResetColumns}
              className="text-ui-fg-muted hover:text-ui-fg-subtle"
              data-id="reset-columns"
            >
              {t("dataGrid.columns.resetToDefault")}
            </Button>
          )}
        </div>
      )}
      <div className="ms-auto flex items-center gap-x-2">
        {headerContent && (
          <div
            className="flex items-center"
            onFocusCapture={() => onHeaderInteractionChange(true)}
          >
            {headerContent}
          </div>
        )}
        {errorCount > 0 && (
          <Button
            size="small"
            variant="secondary"
            type="button"
            onClick={onToggleErrorHighlighting}
            className={clx({
              "bg-ui-button-neutral-pressed": isHighlighted,
            })}
          >
            <ExclamationCircle className="text-ui-fg-subtle" />
            <span>
              {t("dataGrid.errors.count", {
                count: errorCount,
              })}
            </span>
          </Button>
        )}
        <DataGridKeyboardShortcutModal
          open={shortcutsOpen}
          onOpenChange={handleShortcutsOpenChange}
        />
      </div>
    </div>
  )
}

type DataGridHeaderCellProps<TData> = {
  header: HeaderGroup<TData>["headers"][number]
  columnIndex: number
  gapBefore?: number
  direction: ReadingDirection
  onResize: (column: Column<TData>, size: number) => void
  onResizerFocus: () => void
  onResizerExit: () => void
}

const DataGridHeaderCell = <TData,>({
  header,
  columnIndex,
  gapBefore,
  direction,
  onResize,
  onResizerFocus,
  onResizerExit,
}: DataGridHeaderCellProps<TData>) => {
  const { t } = useTranslation()
  const labelId = useId()
  const resizerId = useId()
  const { column } = header
  const { min, max } = getColumnSizeBounds(column)
  const resizeHandler = header.getResizeHandler()

  /**
   * WAI-ARIA window splitter keys; Enter and Tab return to the active cell.
   * Escape keeps its grid-wide meaning (the route modal closes on it).
   */
  const handleResizerKeyDown = (
    e: React.KeyboardEvent<HTMLTableCellElement>
  ) => {
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowRight":
        onResize(
          column,
          column.getSize() + getArrowResizeDelta(e.key, direction)
        )
        break
      case "Home":
        onResize(column, min)
        break
      case "End":
        onResize(column, max)
        break
      case "Enter":
      case "Tab":
        onResizerExit()
        break
      default:
        return
    }

    e.preventDefault()
    e.stopPropagation()
  }

  /** The resizer (an `<hr>`) gets its events through the header cell. */
  const onResizer =
    <TEvent extends React.SyntheticEvent<HTMLTableCellElement>>(
      handler: (e: TEvent) => void
    ) =>
    (e: TEvent) => {
      if (isColumnResizerTarget(e.target)) {
        handler(e)
      }
    }

  return (
    <th
      onFocus={onResizer(onResizerFocus)}
      onKeyDown={onResizer(handleResizerKeyDown)}
      onMouseDown={onResizer((e) => {
        // Dragging keeps the grid's cell navigation; only the keyboard path focuses the handle.
        e.preventDefault()
        resizeHandler(e)
      })}
      onTouchStart={onResizer(resizeHandler)}
      onClick={onResizer((e) => e.stopPropagation())}
      data-column-index={columnIndex}
      aria-colindex={columnIndex + 1}
      style={{
        width: header.getSize(),
        ...getCommonPinningStyles(column),
        marginInlineStart: gapBefore,
      }}
      className="bg-ui-bg-base txt-compact-small-plus flex min-w-0 items-center overflow-hidden border-b border-e px-4 py-2.5 text-start"
    >
      <div id={labelId} className="contents">
        {header.isPlaceholder
          ? null
          : flexRender(column.columnDef.header, header.getContext())}
      </div>
      {column.getCanResize() && (
        <hr
          id={resizerId}
          tabIndex={-1}
          aria-orientation="vertical"
          aria-label={t("fields.width")}
          aria-labelledby={`${resizerId} ${labelId}`}
          aria-valuenow={column.getSize()}
          aria-valuemin={min}
          aria-valuemax={max}
          data-column-resizer={column.id}
          className={clx(
            "hover:bg-ui-fg-interactive focus-visible:bg-ui-fg-interactive absolute end-0 top-0 z-[2] m-0 h-full w-1 cursor-col-resize border-0 touch-none select-none outline-none",
            {
              "bg-ui-fg-interactive": column.getIsResizing(),
            }
          )}
        />
      )}
    </th>
  )
}

type DataGridCellProps<TData> = {
  column: Column<TData>
  content: ReactNode
  columnIndex: number
  ariaColIndex: number
  rowIndex: number
  anchor: DataGridCoordinates | null
  onDragToFillStart: (e: React.MouseEvent<HTMLElement>) => void
  multiColumnSelection: boolean
  gapBefore?: number
}

const DataGridCell = <TData,>({
  column,
  content,
  columnIndex,
  ariaColIndex,
  rowIndex,
  anchor,
  onDragToFillStart,
  multiColumnSelection,
  gapBefore,
}: DataGridCellProps<TData>) => {
  const coords: DataGridCoordinates = {
    row: rowIndex,
    col: columnIndex,
  }

  const isAnchor = isCellMatch(coords, anchor)

  return (
    <td
      aria-colindex={ariaColIndex}
      style={{
        width: column.getSize(),
        ...getCommonPinningStyles(column),
        marginInlineStart: gapBefore,
      }}
      data-row-index={rowIndex}
      data-column-index={columnIndex}
      className={clx(
        "relative flex items-stretch border-b border-e p-0 outline-none"
      )}
      tabIndex={-1}
    >
      <div className="relative w-full">
        {content}
        {isAnchor && (
          <div
            aria-hidden="true"
            onMouseDown={onDragToFillStart}
            className={clx(
              "bg-ui-fg-interactive absolute bottom-0 end-0 z-[3] size-1.5 cursor-ns-resize",
              {
                "cursor-nwse-resize": multiColumnSelection,
              }
            )}
          />
        )}
      </div>
    </td>
  )
}

type DataGridRowProps<TData> = {
  row: Row<TData>
  rowIndex: number
  ariaRowIndex: number
  virtualRow: VirtualItem
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>
  virtualPaddingLeft?: number
  virtualPaddingRight?: number
  virtualColumns: VirtualItem[]
  flatColumns: Column<TData>[]
  anchor: DataGridCoordinates | null
  onDragToFillStart: (e: React.MouseEvent<HTMLElement>) => void
  multiColumnSelection: boolean
}

const DataGridRow = <TData,>({
  row,
  rowIndex,
  ariaRowIndex,
  virtualRow,
  rowVirtualizer,
  virtualPaddingLeft,
  virtualPaddingRight,
  virtualColumns,
  flatColumns,
  anchor,
  onDragToFillStart,
  multiColumnSelection,
}: DataGridRowProps<TData>) => {
  const visibleCells = row.getVisibleCells()

  return (
    <tr
      aria-rowindex={ariaRowIndex}
      data-index={virtualRow.index}
      ref={(node) => rowVirtualizer.measureElement(node)}
      style={{
        transform: `translateY(${virtualRow.start}px)`,
        ...getRowPaddingStyles(virtualPaddingLeft, virtualPaddingRight),
      }}
      className="bg-ui-bg-subtle txt-compact-small absolute flex min-h-10 w-full"
    >
      {virtualColumns.map((vc, index, array) => {
        const cell = visibleCells[vc.index]
        const column = cell.column
        const columnIndex = flatColumns.findIndex((c) => c.id === column.id)

        // Cells read their grid position from the context (see getCellCoordinates).
        const context = { ...cell.getContext(), columnIndex, rowIndex }

        return (
          <DataGridCell
            key={cell.id}
            column={column}
            content={flexRender(cell.column.columnDef.cell, context)}
            columnIndex={columnIndex}
            ariaColIndex={vc.index + 1}
            rowIndex={rowIndex}
            anchor={anchor}
            onDragToFillStart={onDragToFillStart}
            multiColumnSelection={multiColumnSelection}
            gapBefore={getColumnGap(array[index - 1], vc)}
          />
        )
      })}
    </tr>
  )
}

/**
 * Skeleton row component for lazy loading.
 * Displays placeholder cells while data is being fetched.
 */
type DataGridRowSkeletonProps = {
  ariaRowIndex: number
  virtualRow: VirtualItem
  virtualPaddingLeft?: number
  virtualPaddingRight?: number
  virtualColumns: VirtualItem[]
}

const DataGridRowSkeleton = ({
  ariaRowIndex,
  virtualRow,
  virtualPaddingLeft,
  virtualPaddingRight,
  virtualColumns,
}: DataGridRowSkeletonProps) => {
  const { t } = useTranslation()
  return (
    <tr
      aria-rowindex={ariaRowIndex}
      aria-busy={true}
      style={{
        transform: `translateY(${virtualRow.start}px)`,
        ...getRowPaddingStyles(virtualPaddingLeft, virtualPaddingRight),
      }}
      className="bg-ui-bg-subtle txt-compact-small absolute flex h-10 w-full"
    >
      {virtualColumns.map((vc, index, array) => (
        <td
          key={`skeleton-cell-${vc.index}`}
          aria-colindex={vc.index + 1}
          aria-label={t("a11y.cellInput")}
          style={{
            width: vc.size,
            marginInlineStart: getColumnGap(array[index - 1], vc),
          }}
          className="relative flex items-center border-b border-e p-0 outline-none"
        >
          <div className="flex h-full w-full items-center px-4">
            <div className="bg-ui-bg-component h-4 w-3/4 animate-pulse rounded" />
          </div>
        </td>
      ))}
    </tr>
  )
}
