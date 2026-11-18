import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { addSellerMemberWorkflow } from "@mercurjs/core/workflows"
import { MercurModules, SellerRole } from "@mercurjs/types"
import jwt from "jsonwebtoken"

import { adminHeaders, createAdminUser } from "../../../helpers/create-admin-user"
import { createSellerUser } from "../../../helpers/create-seller-user"

jest.setTimeout(120000)

type Headers = { headers: Record<string, string> }
type Check = [method: "get" | "post", url: string, allowed: boolean]
type ErrorResponse = { status: number; data: { code?: string; message?: string } }

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api, dbConnection }) => {
    describe("Seller member checkbox permissions - vendor", () => {
      let container: MedusaContainer
      let owner: Awaited<ReturnType<typeof createSellerUser>>
      let other: Awaited<ReturnType<typeof createSellerUser>>
      let sellerMemberId: string

      const signFor = (authIdentityId: string, actorId: string, sellerId?: string): Headers => {
        const { jwtSecret, jwtOptions } = container.resolve(
          ContainerRegistrationKeys.CONFIG_MODULE
        ).projectConfig.http
        const token = jwt.sign(
          { actor_id: actorId, actor_type: "member", auth_identity_id: authIdentityId },
          jwtSecret,
          { expiresIn: "1d", ...jwtOptions }
        )
        const headers: Record<string, string> = { authorization: `Bearer ${token}` }
        if (sellerId) {
          headers["x-seller-id"] = sellerId
        }
        return { headers }
      }

      const memberHeaders = (): Headers =>
        signFor(other.authIdentity.id, other.member.id, owner.seller.id)

      const memberUrl = (): string =>
        `/vendor/sellers/${owner.seller.id}/members/${sellerMemberId}`

      const failure = (promise: Promise<unknown>): Promise<ErrorResponse> =>
        promise.then(
          () => {
            throw new Error("expected the request to fail")
          },
          (error: { response: ErrorResponse }) => error.response
        )

      const expectChecks = async (checks: Check[]) => {
        const headers = memberHeaders()
        const wrong: string[] = []
        for (const [method, url, allowed] of checks) {
          const response =
            method === "get"
              ? await api.get(url, headers).catch((error) => error.response)
              : await api.post(url, {}, headers).catch((error) => error.response)
          if (allowed ? response.status === 403 : response.status !== 403) {
            wrong.push(`${method.toUpperCase()} ${url} -> ${response.status} (allowed=${allowed})`)
          }
        }
        expect(wrong).toEqual([])
      }

      beforeAll(() => {
        container = getContainer()
      })

      beforeEach(async () => {
        await createAdminUser(dbConnection, adminHeaders, container)
        owner = await createSellerUser(container, {
          email: "custom-owner@test.com",
          name: "Custom Store",
          autoApprove: true,
        })
        other = await createSellerUser(container, {
          email: "custom-member@test.com",
          name: "Custom Member Home",
          autoApprove: true,
        })
        const { result } = await addSellerMemberWorkflow(container).run({
          input: {
            seller_id: owner.seller.id,
            member_id: other.member.id,
            role_id: SellerRole.SUPPORT,
          },
        })
        sellerMemberId = result.id
      })

      it("serves the area table and templates to team managers only", async () => {
        const response = await api.get("/vendor/member-permission-areas", owner.headers)
        expect(response.status).toBe(200)
        expect(response.data.areas).toHaveLength(17)
        expect(response.data.areas[0]).toEqual({ id: "orders", max_right: "manage" })
        expect(Object.keys(response.data.templates).sort()).toEqual(
          [
            SellerRole.ACCOUNTING,
            SellerRole.INVENTORY_MANAGEMENT,
            SellerRole.ORDER_MANAGEMENT,
            SellerRole.SUPPORT,
          ].sort()
        )

        const denied = await failure(api.get("/vendor/member-permission-areas", memberHeaders()))
        expect(denied.status).toBe(403)
      })

      it("applies a checked grant instead of the role template, at once", async () => {
        const updated = await api.post(
          memberUrl(),
          { role_id: SellerRole.SUPPORT, permissions: { orders: "view", products: "manage" } },
          owner.headers
        )
        expect(updated.status).toBe(200)

        await expectChecks([
          ["get", "/vendor/orders", true],
          ["get", "/vendor/products", true],
          ["post", "/vendor/products", true],
          ["get", "/vendor/reviews", false],
          ["get", "/vendor/followers", false],
          ["get", "/vendor/customers", false],
          ["get", "/vendor/auth/messenger-token", false],
          ["get", `/vendor/sellers/${owner.seller.id}/members`, false],
          ["post", `/vendor/sellers/${owner.seller.id}`, false],
        ])

        const list = await api.get(`/vendor/sellers/${owner.seller.id}/members`, owner.headers)
        const row = list.data.seller_members.find(
          (member: { id: string }) => member.id === sellerMemberId
        )
        expect(row.custom_permissions).toEqual({ orders: "view", products: "manage" })

        const me = await api.get(
          "/vendor/members/me?fields=+permissions,+custom_permissions",
          memberHeaders()
        )
        expect(me.data.seller_member.permissions.products).toEqual("manage")
        expect(me.data.seller_member.permissions.reviews).toBeUndefined()

        // A new grant replaces the old one (json columns merge on update).
        await api.post(
          memberUrl(),
          { role_id: SellerRole.SUPPORT, permissions: { customers: "view" } },
          owner.headers
        )
        const replaced = await api.get(`/vendor/sellers/${owner.seller.id}/members`, owner.headers)
        expect(
          replaced.data.seller_members.find((member: { id: string }) => member.id === sellerMemberId)
            .custom_permissions
        ).toEqual({ customers: "view" })
        await expectChecks([
          ["get", "/vendor/customers", true],
          ["get", "/vendor/orders", false],
          ["get", "/vendor/products", false],
          ["post", "/vendor/products", false],
        ])

        // A role change without a grant drops it: the template applies again.
        await api.post(memberUrl(), { role_id: SellerRole.SUPPORT }, owner.headers)
        await expectChecks([
          ["get", "/vendor/reviews", true],
          ["get", "/vendor/followers", true],
          ["post", "/vendor/products", false],
        ])
      })

      it("rejects grants that are unknown, too high, missing a dependency or on the administration role", async () => {
        const bodies = [
          { role_id: SellerRole.SUPPORT, permissions: { members: "view" } },
          { role_id: SellerRole.SUPPORT, permissions: { payouts: "edit" } },
          { role_id: SellerRole.SUPPORT, permissions: { returns: "view" } },
          { role_id: SellerRole.SELLER_ADMINISTRATION, permissions: { orders: "view" } },
        ]
        for (const body of bodies) {
          const response = await failure(api.post(memberUrl(), body, owner.headers))
          expect([JSON.stringify(body), response.status, response.data.code]).toEqual([
            JSON.stringify(body),
            400,
            "member_permissions_invalid",
          ])
        }

        const english = await failure(
          api.post(memberUrl(), bodies[0], owner.headers)
        )
        expect(english.data.message).toBe("These permissions cannot be granted to a member.")

        const invalidRight = await failure(
          api.post(
            memberUrl(),
            { role_id: SellerRole.SUPPORT, permissions: { orders: "delete" } },
            owner.headers
          )
        )
        expect(invalidRight.status).toBe(400)

        const translated = await failure(
          api.post(
            memberUrl(),
            { role_id: SellerRole.SUPPORT, permissions: { members: "view" } },
            { headers: { ...owner.headers.headers, "accept-language": "tr" } }
          )
        )
        expect(translated.data.message).toBe(
          "Bu yetkiler üyeye verilemez. Seçimleri kontrol edip tekrar deneyin."
        )
      })

      it("does not let a member change their own grant", async () => {
        const response = await failure(
          api.post(
            memberUrl(),
            { role_id: SellerRole.SUPPORT, permissions: { orders: "manage" } },
            memberHeaders()
          )
        )
        expect(response.status).toBe(403)
      })

      it("carries the grant from invite through resend to the accepted membership", async () => {
        const invitee = await createSellerUser(container, {
          email: "custom-invitee@test.com",
          name: "Invitee Home",
          autoApprove: true,
        })
        const grant = { orders: "view", returns: "edit", messages: "edit" }

        const created = await api.post(
          `/vendor/sellers/${owner.seller.id}/members`,
          { email: "custom-invitee@test.com", role_id: SellerRole.SUPPORT, permissions: grant },
          owner.headers
        )
        expect(created.status).toBe(201)
        expect(created.data.member_invite.custom_permissions).toEqual(grant)
        expect(created.data.member_invite.token).toBeUndefined()

        const invites = await api.get(
          `/vendor/sellers/${owner.seller.id}/members/invites`,
          owner.headers
        )
        expect(invites.data.member_invites[0].custom_permissions).toEqual(grant)

        const resent = await api.post(
          `/admin/sellers/${owner.seller.id}/members/invites/${created.data.member_invite.id}/resend`,
          {},
          adminHeaders
        )
        expect(resent.status).toBe(200)

        const service = container.resolve(MercurModules.SELLER)
        const [invite] = await service.listMemberInvites(
          { seller_id: owner.seller.id, email: "custom-invitee@test.com" },
          { select: ["token", "custom_permissions"] }
        )
        expect(invite.custom_permissions).toEqual(grant)

        const accepted = await api.post(
          "/vendor/members/invites/accept",
          { invite_token: invite.token },
          signFor(invitee.authIdentity.id, invitee.member.id)
        )
        expect(accepted.status).toBe(200)

        const inviteeHeaders = signFor(invitee.authIdentity.id, invitee.member.id, owner.seller.id)
        const me = await api.get(
          "/vendor/members/me?fields=+permissions,+custom_permissions",
          inviteeHeaders
        )
        expect(me.data.seller_member.custom_permissions).toEqual(grant)
        expect(me.data.seller_member.permissions["orders.returns"]).toEqual("edit")
        expect(me.data.seller_member.permissions.messages).toEqual("edit")
        expect(me.data.seller_member.permissions.reviews).toBeUndefined()

        const reviews = await failure(api.get("/vendor/reviews", inviteeHeaders))
        expect(reviews.status).toBe(403)
      })

      it("rejects an invite grant that is not allowed", async () => {
        const response = await failure(
          api.post(
            `/vendor/sellers/${owner.seller.id}/members`,
            {
              email: "custom-bad@test.com",
              role_id: SellerRole.SUPPORT,
              permissions: { refunds: "edit" },
            },
            owner.headers
          )
        )
        expect(response.status).toBe(400)
        expect(response.data.code).toBe("member_permissions_invalid")
      })
    })
  },
})
