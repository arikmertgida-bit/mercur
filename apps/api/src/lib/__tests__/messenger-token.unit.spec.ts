import jwt from "jsonwebtoken"

const MEDUSA_SECRET = "medusa-session-secret"
const MESSENGER_SECRET = "messenger-only-secret"

type MessengerTokenModule = typeof import("../messenger-token")

const loadModule = (env: {
  JWT_SECRET?: string
  MESSENGER_JWT_SECRET?: string
}): MessengerTokenModule => {
  for (const key of ["JWT_SECRET", "MESSENGER_JWT_SECRET"] as const) {
    const value = env[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  let loaded: MessengerTokenModule | undefined
  jest.isolateModules(() => {
    loaded = require("../messenger-token")
  })
  if (!loaded) {
    throw new Error("module did not load")
  }
  return loaded
}

describe("messenger token", () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("is signed for the messenger only, never with Medusa's secret", () => {
    const { signMessengerToken, MessengerActorType } = loadModule({
      JWT_SECRET: MEDUSA_SECRET,
      MESSENGER_JWT_SECRET: MESSENGER_SECRET,
    })

    const token = signMessengerToken("cus_1", MessengerActorType.CUSTOMER, "8h")

    expect(() => jwt.verify(token, MEDUSA_SECRET)).toThrow()

    const payload = jwt.verify(token, MESSENGER_SECRET, {
      audience: "kayi-messenger",
      issuer: "kayi-api",
      algorithms: ["HS256"],
    })
    expect(payload).toEqual(
      expect.objectContaining({
        sub: "cus_1",
        actor_id: "cus_1",
        actor_type: "customer",
      })
    )
  })

  it("is rejected by a verifier expecting another audience", () => {
    const { signMessengerToken, MessengerActorType } = loadModule({
      JWT_SECRET: MEDUSA_SECRET,
      MESSENGER_JWT_SECRET: MESSENGER_SECRET,
    })

    const token = signMessengerToken("sel_1", MessengerActorType.SELLER, "1m")

    expect(() =>
      jwt.verify(token, MESSENGER_SECRET, { audience: "medusa" })
    ).toThrow()
  })

  it("refuses to start without its own secret", () => {
    expect(() => loadModule({ JWT_SECRET: MEDUSA_SECRET })).toThrow(
      /MESSENGER_JWT_SECRET/
    )
  })

  it("refuses a secret equal to Medusa's JWT_SECRET", () => {
    expect(() =>
      loadModule({ JWT_SECRET: MEDUSA_SECRET, MESSENGER_JWT_SECRET: MEDUSA_SECRET })
    ).toThrow(/must differ/)
  })
})
