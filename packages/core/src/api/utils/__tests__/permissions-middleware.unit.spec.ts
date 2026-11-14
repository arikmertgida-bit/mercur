import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import {
  IPermissionResolver,
  MISSING_PERMISSION_CODE,
  PERMISSIONS_MODULE,
  PermissionMap,
} from "@mercurjs/types"

import {
  requireAnyPermission,
  requirePermission,
  resolvePermissionsMiddleware,
} from "../permissions-middleware"

const makeReq = (resolver?: IPermissionResolver) =>
  ({
    auth_context: { actor_id: "mem_1", actor_type: "member" },
    seller_context: { seller_id: "sel_1", seller_member: { id: "selmem_1" } },
    scope: {
      resolve: (key: string) =>
        key === PERMISSIONS_MODULE
          ? resolver
          : { modules: resolver ? { [PERMISSIONS_MODULE]: {} } : {} },
    },
  }) as unknown as AuthenticatedMedusaRequest

const makeRes = () => {
  const res = { statusCode: 200, body: undefined as unknown }
  const api = {
    status(code: number) {
      res.statusCode = code
      return api
    },
    json(body: unknown) {
      res.body = body
      return api
    },
  }
  return { res, api: api as unknown as MedusaResponse }
}

const run = async (req: AuthenticatedMedusaRequest, key: string, right: "view" | "edit") => {
  const next = jest.fn()
  await resolvePermissionsMiddleware("vendor")(req, makeRes().api, next)
  const { res, api } = makeRes()
  const allowed = jest.fn()
  requirePermission(key, right)(req, api, allowed)
  return { res, allowed }
}

describe("permissions middleware", () => {
  it("allows everything when the permissions module is not configured", async () => {
    const req = makeReq()
    const { allowed } = await run(req, "payouts", "edit")

    expect(allowed).toHaveBeenCalled()
    expect(req.permissions?.orders).toBe("manage")
  })

  it("passes the seller context to the resolver", async () => {
    const resolvePermissions = jest.fn(async (): Promise<PermissionMap> => ({}))
    await run(makeReq({ resolvePermissions }), "orders", "view")

    expect(resolvePermissions).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: "mem_1",
        surface: "vendor",
        seller_id: "sel_1",
        seller_member_id: "selmem_1",
      }),
      expect.any(Array)
    )
  })

  it("enforces the resolved rights", async () => {
    const resolver = {
      resolvePermissions: async (): Promise<PermissionMap> => ({ orders: "edit" }),
    }

    expect((await run(makeReq(resolver), "orders", "view")).allowed).toHaveBeenCalled()

    // A denial goes through next(error) so the app's error handler can
    // localize the message (vendor/admin-error-i18n); writing the response
    // here would bypass it and always answer in English.
    const denied = await run(makeReq(resolver), "payouts", "view")
    expect(denied.res.body).toBeUndefined()
    expect(denied.allowed).toHaveBeenCalledTimes(1)
    const [error] = denied.allowed.mock.calls[0]
    expect(MedusaError.isMedusaError(error)).toBe(true)
    expect(error).toEqual(
      expect.objectContaining({
        type: MedusaError.Types.FORBIDDEN,
        code: MISSING_PERMISSION_CODE,
        message: "Missing required permission: payouts:view",
      })
    )
  })

  it("passes a forbidden error to next when no alternative right is held", async () => {
    const req = makeReq({
      resolvePermissions: async (): Promise<PermissionMap> => ({ orders: "view" }),
    })
    await resolvePermissionsMiddleware("vendor")(req, makeRes().api, jest.fn())

    const next = jest.fn()
    const { res, api } = makeRes()
    requireAnyPermission([
      { key: "products", right: "edit" },
      { key: "store", right: "edit" },
    ])(req, api, next)

    expect(res.body).toBeUndefined()
    const [error] = next.mock.calls[0]
    expect(error).toEqual(
      expect.objectContaining({
        type: MedusaError.Types.FORBIDDEN,
        code: MISSING_PERMISSION_CODE,
        message: "Missing required permission: products:edit or store:edit",
      })
    )
  })
})
