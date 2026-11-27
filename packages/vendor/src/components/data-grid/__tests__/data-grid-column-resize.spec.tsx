// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import type { ReactElement } from "react"
import { useForm } from "react-hook-form"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import { DataGridRoot } from "../components/data-grid-root"

// jsdom lays nothing out; the row/column virtualizers read the scroll container's client size.
const VIEWPORT = { clientWidth: 1200, clientHeight: 600 }
const originalSizes = Object.keys(VIEWPORT).map((name) => ({
  name,
  descriptor: Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
}))

beforeAll(() => {
  for (const [name, value] of Object.entries(VIEWPORT)) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      get: () => value,
    })
  }
})

afterAll(() => {
  for (const { name, descriptor } of originalSizes) {
    if (descriptor) {
      Object.defineProperty(HTMLElement.prototype, name, descriptor)
    }
  }
})
import { DataGridTextCell } from "../components/data-grid-text-cell"
import { createDataGridHelper } from "../helpers/create-data-grid-column-helper"

type VariantRow = { index: number }

type VariantForm = {
  variants: { title: string; sku: string }[]
}

const helper = createDataGridHelper<VariantRow, VariantForm>()

const columns = [
  helper.column({
    id: "title",
    header: "Title",
    cell: (context) => <DataGridTextCell context={context} />,
    field: (context) => `variants.${context.row.original.index}.title`,
    type: "text",
  }),
  helper.column({
    id: "sku",
    header: "SKU",
    cell: (context) => <DataGridTextCell context={context} />,
    field: (context) => `variants.${context.row.original.index}.sku`,
    type: "text",
  }),
]

const rows: VariantRow[] = [{ index: 0 }, { index: 1 }]

const Grid = (): ReactElement => {
  const form = useForm<VariantForm>({
    defaultValues: {
      variants: [
        { title: "S", sku: "S-1" },
        { title: "M", sku: "M-1" },
      ],
    },
  })

  return <DataGridRoot data={rows} columns={columns} state={form} />
}

/** The `<hr>` resizer is named "<width label> <column header>". */
const getResizer = (header: string): HTMLElement =>
  screen.getByRole("separator", { name: `fields.width ${header}` })

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

const activeColumn = (): string | null =>
  document.activeElement?.closest("td")?.getAttribute("data-column-index") ??
  null

const width = (resizer: HTMLElement): string | null =>
  resizer.getAttribute("aria-valuenow")

describe("DataGridRoot column resize from the keyboard", () => {
  afterEach(() => {
    cleanup()
    document.documentElement.removeAttribute("dir")
  })

  it("exposes each resize handle as a vertical window splitter", () => {
    render(<Grid />)

    const resizer = getResizer("Title")
    expect(resizer.tagName).toBe("HR")
    expect(resizer.getAttribute("aria-orientation")).toBe("vertical")
    expect(resizer.getAttribute("tabindex")).toBe("-1")
    expect(width(resizer)).toBe("200")
    expect(resizer.getAttribute("aria-valuemin")).toBe("60")
    expect(resizer.getAttribute("aria-valuemax")).toBe("400")
  })

  it("Alt+Shift+Arrow on the active cell resizes its column and focuses the handle", () => {
    render(<Grid />)

    pressOnWindow("ArrowRight", { altKey: true, shiftKey: true })

    const resizer = getResizer("Title")
    expect(width(resizer)).toBe("210")
    expect(document.activeElement).toBe(resizer)
    expect(width(getResizer("SKU"))).toBe("200")
  })

  it("arrows, Home and End on the handle step and clamp the width", () => {
    render(<Grid />)
    pressOnWindow("ArrowRight", { altKey: true, shiftKey: true })
    const resizer = getResizer("Title")

    expect(fireEvent.keyDown(resizer, { key: "ArrowLeft" })).toBe(false)
    expect(width(resizer)).toBe("200")
    fireEvent.keyDown(resizer, { key: "Home" })
    expect(width(resizer)).toBe("60")
    fireEvent.keyDown(resizer, { key: "ArrowLeft" })
    expect(width(resizer)).toBe("60")
    fireEvent.keyDown(resizer, { key: "End" })
    expect(width(resizer)).toBe("400")
    fireEvent.keyDown(resizer, { key: "ArrowRight" })
    expect(width(resizer)).toBe("400")
  })

  it("does not move the cell selection while the handle has focus", () => {
    render(<Grid />)
    pressOnWindow("ArrowRight", { altKey: true, shiftKey: true })
    const resizer = getResizer("Title")

    pressOnWindow("ArrowRight")

    expect(document.activeElement).toBe(resizer)
    expect(width(resizer)).toBe("210")
  })

  it.each(["Enter", "Tab"])(
    "%s returns focus to the active cell",
    async (key) => {
      render(<Grid />)
      pressOnWindow("ArrowRight", { altKey: true, shiftKey: true })
      const resizer = getResizer("Title")

      expect(fireEvent.keyDown(resizer, { key })).toBe(false)

      await waitFor(() => {
        expect(document.activeElement?.closest("td")).not.toBeNull()
      })
      expect(width(resizer)).toBe("210")
    },
  )

  it("leaves Escape to the route modal, as everywhere else in the grid", () => {
    render(<Grid />)
    pressOnWindow("ArrowRight", { altKey: true, shiftKey: true })
    const resizer = getResizer("Title")

    expect(fireEvent.keyDown(resizer, { key: "Escape" })).toBe(true)
  })

  it("follows the reading direction in RTL", () => {
    document.documentElement.setAttribute("dir", "rtl")
    render(<Grid />)

    pressOnWindow("ArrowLeft", { altKey: true, shiftKey: true })
    const resizer = getResizer("Title")
    expect(width(resizer)).toBe("210")

    fireEvent.keyDown(resizer, { key: "ArrowRight" })
    expect(width(resizer)).toBe("200")
  })

  it.each([
    ["ltr", "ArrowRight"],
    ["rtl", "ArrowLeft"],
  ])(
    "moves the active cell toward the next column with the arrow that points there (%s)",
    async (dir, key) => {
      document.documentElement.setAttribute("dir", dir)
      render(<Grid />)
      await waitFor(() => {
        expect(activeColumn()).toBe("0")
      })

      pressOnWindow(key)

      await waitFor(() => {
        expect(activeColumn()).toBe("1")
      })
    }
  )

  it("pins the first column to the reading start", () => {
    document.documentElement.setAttribute("dir", "rtl")
    render(<Grid />)

    const firstHeader = getResizer("Title").closest("th")
    expect(firstHeader?.style.insetInlineStart).toBe("0px")
    expect(firstHeader?.style.left).toBe("")
  })

  it("keeps mouse dragging from focusing the handle", () => {
    render(<Grid />)

    expect(fireEvent.mouseDown(getResizer("Title"))).toBe(false)
    expect(document.activeElement).not.toBe(getResizer("Title"))
  })
})
