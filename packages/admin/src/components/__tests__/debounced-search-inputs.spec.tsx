// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { ReactNode, useState } from "react"
import { MemoryRouter, useLocation } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Query } from "../filtering/query"
import { DataTableSearch } from "../table/data-table/data-table-search"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string): string => key }),
}))

const LocationProbe = (): ReactNode => {
  const { search } = useLocation()

  return <output data-testid="search">{search}</output>
}

const currentParams = (): URLSearchParams =>
  new URLSearchParams(screen.getByTestId("search").textContent ?? "")

/** A list page that re-renders its search box on demand, e.g. on a refetch. */
const SearchPage = (): ReactNode => {
  const [count, setCount] = useState(0)

  return (
    <>
      <button type="button" onClick={() => setCount(count + 1)}>
        rerender {count}
      </button>
      <DataTableSearch />
    </>
  )
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("Query", () => {
  it("keeps the other search params when it writes q", () => {
    render(
      <MemoryRouter initialEntries={["/orders?status=pending&order=-created_at"]}>
        <Query />
        <LocationProbe />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "ayakkabı" },
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    const params = currentParams()
    expect(params.get("q")).toBe("ayakkabı")
    expect(params.get("status")).toBe("pending")
    expect(params.get("order")).toBe("-created_at")
  })

  it("removes only q when the input is cleared", () => {
    render(
      <MemoryRouter initialEntries={["/orders?q=old&status=pending"]}>
        <Query />
        <LocationProbe />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    const params = currentParams()
    expect(params.has("q")).toBe(false)
    expect(params.get("status")).toBe("pending")
  })
})

describe("DataTableSearch", () => {
  it("still applies the search when the page re-renders while typing", () => {
    render(
      <MemoryRouter initialEntries={["/products?offset=40"]}>
        <SearchPage />
        <LocationProbe />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "kazak" },
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    fireEvent.click(screen.getByRole("button", { name: /rerender/ }))
    act(() => {
      vi.advanceTimersByTime(300)
    })

    const params = currentParams()
    expect(params.get("q")).toBe("kazak")
    expect(params.has("offset")).toBe(false)
  })

  it("applies only the last value typed within the delay", () => {
    render(
      <MemoryRouter initialEntries={["/products"]}>
        <DataTableSearch />
        <LocationProbe />
      </MemoryRouter>
    )

    const input = screen.getByRole("searchbox")
    fireEvent.change(input, { target: { value: "ka" } })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.change(input, { target: { value: "kaz" } })
    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(currentParams().has("q")).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(currentParams().get("q")).toBe("kaz")
  })
})
