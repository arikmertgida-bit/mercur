// @vitest-environment jsdom
import { existsSync } from "node:fs"
import { join } from "node:path"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { DynamicAvatar } from "../DynamicAvatar"

// The fallbacks are served by the storefront (D:\kayi.com-v2\storefront\public).
const STOREFRONT_PUBLIC = join(import.meta.dirname, "../../../../../../../../storefront/public")

const currentSrc = (): string => screen.getByRole("img").getAttribute("src") ?? ""

afterEach(cleanup)

describe("DynamicAvatar", () => {
  it.each(["CUSTOMER", "SELLER", "ADMIN"])("falls back to a storefront file that exists (%s)", (type) => {
    render(<DynamicAvatar src={null} alt="avatar" type={type} />)
    const path = new URL(currentSrc()).pathname
    expect(existsSync(`${STOREFRONT_PUBLIC}${path}`)).toBe(true)
  })

  it("retries a new src after an earlier one failed", () => {
    const { rerender } = render(<DynamicAvatar src="https://media.test/broken.jpg" alt="avatar" />)
    fireEvent.error(screen.getByRole("img"))
    expect(currentSrc()).not.toBe("https://media.test/broken.jpg")

    rerender(<DynamicAvatar src="https://media.test/working.jpg" alt="avatar" />)
    expect(currentSrc()).toBe("https://media.test/working.jpg")
  })
})
