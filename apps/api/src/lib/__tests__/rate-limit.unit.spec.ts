import { isUncountedAuthSuccess, resolveClientIp, resolveReporterKey } from "../rate-limit"

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

describe("resolveReporterKey", () => {
  it("keys reports by the logged-in customer, not the shared address", () => {
    const behindProxy = { socket: { remoteAddress: "172.18.0.9" }, ip: "172.18.0.9", headers: {} }
    expect(resolveReporterKey({ ...behindProxy, auth_context: { actor_id: "cus_1" } })).toBe("customer:cus_1")
    expect(resolveReporterKey({ ...behindProxy, auth_context: { actor_id: "cus_2" } })).toBe("customer:cus_2")
  })

  it("falls back to the client address without a customer", () => {
    expect(resolveReporterKey({ socket: { remoteAddress: "85.105.1.2" }, ip: "85.105.1.2", headers: {} })).toBe(
      "85.105.1.2"
    )
  })
})

describe("isUncountedAuthSuccess", () => {
  it("does not count successful logins, session exchanges or refreshes", () => {
    expect(isUncountedAuthSuccess("/auth/customer/emailpass", 200)).toBe(true)
    expect(isUncountedAuthSuccess("/auth/member/emailpass", 200)).toBe(true)
    expect(isUncountedAuthSuccess("/auth/session", 200)).toBe(true)
    expect(isUncountedAuthSuccess("/auth/token/refresh?x=1", 200)).toBe(true)
  })

  it("counts failed logins", () => {
    expect(isUncountedAuthSuccess("/auth/customer/emailpass", 401)).toBe(false)
  })

  it("counts registration and password reset even when they succeed", () => {
    expect(isUncountedAuthSuccess("/auth/customer/emailpass/register", 200)).toBe(false)
    expect(isUncountedAuthSuccess("/auth/customer/emailpass/reset-password", 201)).toBe(false)
    expect(isUncountedAuthSuccess("/auth/customer/emailpass/update", 200)).toBe(false)
  })
})
