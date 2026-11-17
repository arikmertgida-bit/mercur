import { resolveClientIp } from "../rate-limit"

const request = (
  remoteAddress: string,
  headers: Record<string, string> = {}
): Parameters<typeof resolveClientIp>[0] => ({
  socket: { remoteAddress },
  ip: remoteAddress,
  headers,
})

describe("resolveClientIp", () => {
  it("uses X-Real-IP set by nginx or the storefront (private peers)", () => {
    expect(resolveClientIp(request("172.18.0.9", { "x-real-ip": "85.105.1.2" }))).toBe("85.105.1.2")
    expect(resolveClientIp(request("::ffff:172.18.0.9", { "x-real-ip": "85.105.1.3" }))).toBe("85.105.1.3")
  })

  it("gives different visitors behind the same proxy different buckets", () => {
    const a = resolveClientIp(request("172.18.0.9", { "x-real-ip": "85.105.1.2" }))
    const b = resolveClientIp(request("172.18.0.9", { "x-real-ip": "31.200.4.5" }))
    expect(a).not.toBe(b)
  })

  it("ignores X-Forwarded-For, which the client controls", () => {
    expect(
      resolveClientIp(request("172.18.0.9", { "x-forwarded-for": "1.2.3.4, 85.105.1.2" }))
    ).toBe("172.18.0.9")
  })

  it("ignores X-Real-IP from a public peer", () => {
    expect(resolveClientIp(request("85.105.1.2", { "x-real-ip": "9.9.9.9" }))).toBe("85.105.1.2")
  })

  it("ignores a header value that is not an IP address", () => {
    expect(resolveClientIp(request("172.18.0.9", { "x-real-ip": "random-123" }))).toBe("172.18.0.9")
  })
})
