// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { createTable, getCoreRowModel } from "@tanstack/react-table"
import type { ReactElement } from "react"
import { useForm } from "react-hook-form"
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest"

import { DataGridRoot } from "../components/data-grid-root"
import { DataGridTextCell } from "../components/data-grid-text-cell"
import { createDataGridHelper } from "../helpers/create-data-grid-column-helper"
import { DataGridMatrix } from "../models"
import { getVisibleIndex } from "../utils"

// jsdom lays nothing out; the virtualizers read the scroll container's client
// size and clamp scrolling to its scroll size.
const COLUMN_WIDTH = 200
const COLUMN_COUNT = 15
const VIEWPORT = {
  clientWidth: 1200,
  clientHeight: 600,
  scrollWidth: COLUMN_COUNT * COLUMN_WIDTH,
  scrollHeight: 600,
}

type ScrollCall = { left?: number; top?: number }

let scrollCalls: ScrollCall[] = []

const originals = [...Object.keys(VIEWPORT), "scrollTo"].map((name) => ({
  name,
  descriptor: Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
}))

class TestResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeAll(() => {
  for (const [name, value] of Object.entries(VIEWPORT)) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      get: () => value,
    })
  }

  // Records the virtualizer's scroll requests without moving the viewport.
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: (options: ScrollCall) => {
      scrollCalls.push(options)
    },
  })

  globalThis.ResizeObserver = TestResizeObserver
})

afterAll(() => {
  for (const { name, descriptor } of originals) {
    if (descriptor) {
      Object.defineProperty(HTMLElement.prototype, name, descriptor)
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, name)
    }
  }
})

type PriceRow = { index: number }

type PriceForm = {
  rows: Record<string, string>[]
}

const helper = createDataGridHelper<PriceRow, PriceForm>()

const columnIds = Array.from({ length: COLUMN_COUNT }, (_, col) => `c${col}`)

const columns = columnIds.map((id, col) =>
  helper.column({
    id,
    name: `Column ${col}`,
    header: `Column ${col}`,
    cell: (context) => <DataGridTextCell context={context} />,
    field: (context) => `rows.${context.row.original.index}.${id}`,
    type: "text",
    disableHiding: col === 0,
  }),
)

const rows: PriceRow[] = [{ index: 0 }, { index: 1 }]

const Grid = (): ReactElement => {
  const form = useForm<PriceForm>({
    defaultValues: {
      rows: rows.map(({ index }) =>
        Object.fromEntries(columnIds.map((id) => [id, `${id}-${index}`])),
      ),
    },
  })

  return <DataGridRoot data={rows} columns={columns} state={form} />
}

const pressOnWindow = (key: string, init: KeyboardEventInit = {}): void => {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    )
  })
}

const activeCell = (): HTMLElement | null =>
  document.activeElement?.closest("td") ?? null

const activeColumn = (): string | null =>
  activeCell()?.getAttribute("data-column-index") ?? null

const waitForActiveColumn = async (col: number): Promise<void> => {
  await waitFor(() => {
    expect(activeColumn()).toBe(String(col))
  })
}

/** The header menus switch the grid's key trap off; clicking the grid turns it back on. */
const backToGrid = async (): Promise<void> => {
  // Radix hands focus back to the menu trigger once the menu has closed.
  await waitFor(() => {
    expect(screen.queryByRole("menu")).toBeNull()
  })
  fireEvent.click(screen.getByRole("grid"))
  // The active cell takes focus back on the next frame.
  await waitFor(() => {
    expect(activeCell()).not.toBeNull()
  })
}

const toggleColumn = async (name: string): Promise<void> => {
  fireEvent.keyDown(
    screen.getByRole("button", { name: "dataGrid.columns.view" }),
    { key: "Enter" },
  )
  fireEvent.click(screen.getByRole("menuitemcheckbox", { name }))
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
  await backToGrid()
}

const lastHorizontalScroll = (): number | undefined => {
  const horizontal = scrollCalls.filter((call) => call.left !== undefined)
  return horizontal[horizontal.length - 1]?.left
}

describe("DataGridMatrix with hidden rows and columns", () => {
  const matrixRows: PriceRow[] = [{ index: 0 }, { index: 1 }, { index: 2 }]

  const createMatrix = (): DataGridMatrix<PriceRow> => {
    const table = createTable({
      data: matrixRows,
      columns,
      getCoreRowModel: getCoreRowModel(),
      state: {},
      onStateChange: () => {},
      renderFallbackValue: null,
    })

    return new DataGridMatrix(table.getRowModel().flatRows, columns)
  }

  it("leaves hidden rows out of a selected range", () => {
    const matrix = createMatrix()
    matrix.toggleRow(1, false)

    expect(
      matrix.getFieldsInSelection({ row: 0, col: 2 }, { row: 2, col: 2 }),
    ).toEqual(["rows.0.c2", "rows.2.c2"])
  })

  it("skips hidden rows when moving down", () => {
    const matrix = createMatrix()
    matrix.toggleRow(1, false)

    expect(matrix.getValidMovement(0, 2, "ArrowDown")).toEqual({
      row: 2,
      col: 2,
    })
    matrix.toggleRow(2, false)
    expect(matrix.getValidMovement(0, 2, "ArrowDown", true)).toEqual({
      row: 0,
      col: 2,
    })
  })
})

describe("getVisibleIndex", () => {
  const all = ["a", "b", "c", "d"].map((id) => ({ id }))
  const visible = all.filter(({ id }) => id !== "b")

  it("maps a matrix index to the index among visible items", () => {
    expect(getVisibleIndex(all, visible, 0)).toBe(0)
    expect(getVisibleIndex(all, visible, 2)).toBe(1)
    expect(getVisibleIndex(all, visible, 3)).toBe(2)
  })

  it("gives a hidden item the slot it takes once shown", () => {
    expect(getVisibleIndex(all, visible, 1)).toBe(1)
  })

  it("returns -1 outside the matrix", () => {
    expect(getVisibleIndex(all, visible, 4)).toBe(-1)
    expect(getVisibleIndex(all, visible, -1)).toBe(-1)
  })
})

describe("DataGridRoot with hidden columns", () => {
  beforeEach(() => {
    scrollCalls = []
  })

  afterEach(() => {
    cleanup()
    document.documentElement.removeAttribute("dir")
  })

  it("keeps the active cell rendered when it sits past a hidden column", async () => {
    render(<Grid />)
    await waitForActiveColumn(0)

    await toggleColumn("Column 1")
    pressOnWindow("ArrowRight", { ctrlKey: true })

    await waitForActiveColumn(COLUMN_COUNT - 1)
  })

  it("scrolls to the visible column that follows the active cell", async () => {
    render(<Grid />)
    await waitForActiveColumn(0)
    await toggleColumn("Column 1")

    // One key at a time: each move starts from the cell the previous one reached.
    await [2, 3, 4, 5, 6].reduce<Promise<void>>(
      (previous, col) =>
        previous.then(async () => {
          pressOnWindow("ArrowRight")
          await waitForActiveColumn(col)
        }),
      Promise.resolve()
    )

    // Column 6 is the 6th visible column; the grid looks one column ahead.
    const visibleAhead = 6
    expect(lastHorizontalScroll()).toBe(
      (visibleAhead + 1) * COLUMN_WIDTH - VIEWPORT.clientWidth,
    )
  })

  it("does not jump onto a hidden column with Ctrl+Arrow", async () => {
    render(<Grid />)
    await waitForActiveColumn(0)

    await toggleColumn(`Column ${COLUMN_COUNT - 1}`)
    pressOnWindow("ArrowRight", { ctrlKey: true })

    await waitForActiveColumn(COLUMN_COUNT - 2)
  })

  it("navigates into columns again after resetting the view", async () => {
    render(<Grid />)
    await waitForActiveColumn(0)

    await toggleColumn("Column 1")
    fireEvent.click(
      screen.getByRole("button", { name: "dataGrid.columns.resetToDefault" }),
    )
    await backToGrid()
    pressOnWindow("ArrowRight")

    await waitForActiveColumn(1)
  })

  it("numbers aria-colindex by visible columns, data-column-index by the matrix", async () => {
    render(<Grid />)
    await waitForActiveColumn(0)

    await toggleColumn("Column 1")
    pressOnWindow("ArrowRight")
    await waitForActiveColumn(2)

    expect(activeCell()?.getAttribute("aria-colindex")).toBe("2")

    const header = screen.getByRole("columnheader", { name: /Column 2/ })
    expect(header.getAttribute("aria-colindex")).toBe("2")
    expect(header.getAttribute("data-column-index")).toBe("2")
    expect(screen.getByRole("grid").getAttribute("aria-colcount")).toBe(
      String(COLUMN_COUNT - 1),
    )
  })

  it("moves past a hidden column in RTL too", async () => {
    document.documentElement.setAttribute("dir", "rtl")
    render(<Grid />)
    await waitForActiveColumn(0)

    await toggleColumn("Column 1")
    pressOnWindow("ArrowLeft")

    await waitForActiveColumn(2)
    expect(activeCell()?.getAttribute("aria-colindex")).toBe("2")
  })
})
