// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

type CustomersResponse = { customers: Array<{ metadata: { avatar_url: string | null } }> }

const pending = new Map<string, (response: CustomersResponse) => void>()
const customersQuery = vi.fn(
  (input: { id: string }): Promise<CustomersResponse> =>
    new Promise((resolve): void => {
      pending.set(input.id, resolve)
    })
)

vi.mock("../../lib/client", () => ({
  client: { admin: { customers: { query: customersQuery } } },
}))

const { useCustomerAvatar } = await import("../useCustomerAvatar")

const answer = async (customerId: string, avatarUrl: string | null): Promise<void> => {
  const resolve = pending.get(customerId)
  if (!resolve) throw new Error(`no pending avatar request for ${customerId}`)
  await act(async (): Promise<void> => {
    resolve({ customers: [{ metadata: { avatar_url: avatarUrl } }] })
  })
}

describe("useCustomerAvatar", () => {
  it("drops the previous customer's avatar once the id is cleared", async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) => useCustomerAvatar(id),
      { initialProps: { id: "cus_cleared" } }
    )
    await answer("cus_cleared", "https://media.test/cleared.jpg")
    expect(result.current.avatarUrl).toBe("https://media.test/cleared.jpg")

    rerender({ id: undefined })
    expect(result.current.avatarUrl).toBeNull()
  })

  it("ignores a late answer for a customer that is no longer shown", async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useCustomerAvatar(id),
      { initialProps: { id: "cus_slow" } }
    )
    rerender({ id: "cus_fast" })
    await answer("cus_fast", "https://media.test/fast.jpg")
    await answer("cus_slow", "https://media.test/slow.jpg")

    expect(result.current.avatarUrl).toBe("https://media.test/fast.jpg")
  })

  it("does not query ids that are not customers", () => {
    const { result } = renderHook(() => useCustomerAvatar("sel_not_a_customer"))
    expect(result.current.avatarUrl).toBeNull()
    expect(customersQuery).not.toHaveBeenCalledWith({ id: "sel_not_a_customer" })
  })
})
