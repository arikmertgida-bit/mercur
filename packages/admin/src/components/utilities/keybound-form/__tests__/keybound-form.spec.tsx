// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { KeyboundForm } from "../keybound-form"

const renderForm = (onSubmit: () => void): void => {
  render(
    <KeyboundForm onSubmit={onSubmit}>
      <input aria-label="title" />
      <input aria-label="agree" type="checkbox" />
      <textarea aria-label="description" />
      <button type="button">cancel</button>
      <button type="submit">save</button>
    </KeyboundForm>
  )
}

/** fireEvent returns false when a handler called preventDefault. */
const pressEnter = (element: HTMLElement, modifier = false): boolean =>
  fireEvent.keyDown(element, { key: "Enter", ctrlKey: modifier })

describe("KeyboundForm", () => {
  afterEach(cleanup)

  it("blocks implicit submission from inputs", () => {
    const onSubmit = vi.fn()
    renderForm(onSubmit)

    expect(pressEnter(screen.getByLabelText("title"))).toBe(false)
    expect(pressEnter(screen.getByLabelText("agree"))).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("leaves Enter alone on buttons and in textareas", () => {
    const onSubmit = vi.fn()
    renderForm(onSubmit)

    expect(pressEnter(screen.getByRole("button", { name: "cancel" }))).toBe(true)
    expect(pressEnter(screen.getByRole("button", { name: "save" }))).toBe(true)
    expect(pressEnter(screen.getByLabelText("description"))).toBe(true)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits with Ctrl+Enter, also from a textarea", () => {
    const onSubmit = vi.fn()
    renderForm(onSubmit)

    expect(pressEnter(screen.getByLabelText("title"), true)).toBe(false)
    expect(pressEnter(screen.getByLabelText("description"), true)).toBe(false)
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  it("lets a consumer replace the key handling", () => {
    const onSubmit = vi.fn()
    const onKeyDown = vi.fn()
    render(
      <KeyboundForm onSubmit={onSubmit} onKeyDown={onKeyDown}>
        <input aria-label="title" />
      </KeyboundForm>
    )

    expect(pressEnter(screen.getByLabelText("title"), true)).toBe(true)
    expect(onKeyDown).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
