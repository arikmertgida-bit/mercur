import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { addSellerMemberWorkflow } from "@mercurjs/core/workflows"
import { SellerRole } from "@mercurjs/types"
import jwt from "jsonwebtoken"

import { adminHeaders, createAdminUser } from "../../../helpers/create-admin-user"
import { createSellerUser } from "../../../helpers/create-seller-user"

jest.setTimeout(120000)

type Headers = { headers: Record<string, string> }
type Check = [method: "get" | "post", url: string, allowed: boolean]

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api, dbConnection }) => {
    describe("Seller member roles - vendor", () => {
      let container: MedusaContainer
      let owner: Awaited<ReturnType<typeof createSellerUser>>
      let other: Awaited<ReturnType<typeof createSellerUser>>
      let sellerMemberId: string

      const signFor = (authIdentityId: string, actorId: string, sellerId: string): Headers => {
        const { jwtSecret, jwtOptions } = container.resolve(
          ContainerRegistrationKeys.CONFIG_MODULE
        ).projectConfig.http
        const token = jwt.sign(
          { actor_id: actorId, actor_type: "member", auth_identity_id: authIdentityId },
          jwtSecret,
          { expiresIn: "1d", ...jwtOptions }
        )
        return { headers: { authorization: `Bearer ${token}`, "x-seller-id": sellerId } }
      }

      const memberHeaders = (): Headers =>
        signFor(other.authIdentity.id, other.member.id, owner.seller.id)

      const setRole = async (role: SellerRole) => {
        await api.post(
          `/vendor/sellers/${owner.seller.id}/members/${sellerMemberId}`,
          { role_id: role },
          owner.headers
        )
      }

      const statusOf = async (check: Check, headers: Headers): Promise<number> => {
        const [method, url] = check
        const response =
          method === "get"
            ? await api.get(url, headers).catch((error) => error.response)
            : await api.post(url, {}, headers).catch((error) => error.response)
        return response.status
      }

      const expectChecks = async (checks: Check[]) => {
        const headers = memberHeaders()
        const wrong: string[] = []
        for (const check of checks) {
          const status = await statusOf(check, headers)
          const [method, url, allowed] = check
          if (allowed ? status === 403 : status !== 403) {
            wrong.push(`${method.toUpperCase()} ${url} -> ${status} (allowed=${allowed})`)
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
          email: "roles-owner@test.com",
          name: "Roles Store",
          autoApprove: true,
        })
        other = await createSellerUser(container, {
          email: "roles-member@test.com",
          name: "Member Home Store",
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

      it("keeps the owner fully privileged", async () => {
        for (const url of [
          "/vendor/payouts",
          `/vendor/sellers/${owner.seller.id}/members`,
          "/vendor/reviews",
          "/vendor/followers",
          "/vendor/dashboard",
          "/vendor/inventory-items",
        ]) {
          const response = await api.get(url, owner.headers).catch((error) => error.response)
          expect([url, response.status]).not.toEqual([url, 403])
        }
      })

      it("support: orders, customers, reviews, followers; no payouts, products edit, team, dashboard", async () => {
        await expectChecks([
          ["get", "/vendor/orders", true],
          ["get", "/vendor/customers", true],
          ["get", "/vendor/products", true],
          ["get", "/vendor/reviews", true],
          ["get", "/vendor/followers", true],
          ["post", "/vendor/review-reports", true],
          ["get", "/vendor/payouts", false],
          ["post", "/vendor/products", false],
          ["get", "/vendor/inventory-items", false],
          ["get", `/vendor/sellers/${owner.seller.id}/members`, false],
          ["post", `/vendor/sellers/${owner.seller.id}/members`, false],
          ["get", "/vendor/dashboard", false],
          ["post", "/vendor/notification-preferences", false],
          ["post", `/vendor/sellers/${owner.seller.id}`, false],
        ])
      })

      it("inventory: products and stock; no customers, payouts, messages, dashboard", async () => {
        await setRole(SellerRole.INVENTORY_MANAGEMENT)
        await expectChecks([
          ["get", "/vendor/products", true],
          ["post", "/vendor/products", true],
          ["get", "/vendor/inventory-items", true],
          ["get", "/vendor/stock-locations", true],
          ["get", "/vendor/price-lists", true],
          ["get", "/vendor/orders", true],
          ["get", "/vendor/customers", false],
          ["get", "/vendor/payouts", false],
          ["get", "/vendor/dashboard", false],
          ["get", "/vendor/support/admin-contact", false],
          ["post", "/vendor/review-reports", false],
        ])
      })

      it("accounting: payouts, commissions, dashboard; no product or stock writes", async () => {
        await setRole(SellerRole.ACCOUNTING)
        await expectChecks([
          ["get", "/vendor/payouts", true],
          ["get", "/vendor/orders", true],
          ["get", "/vendor/dashboard", true],
          ["get", "/vendor/products", true],
          ["post", "/vendor/products", false],
          ["get", "/vendor/inventory-items", false],
          ["post", "/vendor/promotions", false],
          ["get", "/vendor/reviews", false],
          ["post", "/vendor/payout-accounts", false],
        ])
      })

      it("order management: orders and stock view; no payouts, stock writes, team", async () => {
        await setRole(SellerRole.ORDER_MANAGEMENT)
        await expectChecks([
          ["get", "/vendor/orders", true],
          ["get", "/vendor/inventory-items", true],
          ["get", "/vendor/dashboard", true],
          ["get", "/vendor/reviews", true],
          ["post", "/vendor/inventory-items", false],
          ["get", "/vendor/payouts", false],
          ["get", "/vendor/price-lists", false],
          ["get", `/vendor/sellers/${owner.seller.id}/members`, false],
        ])
      })

      it("returns the member's own rights on members/me", async () => {
        const response = await api.get("/vendor/members/me?fields=+permissions", memberHeaders())
        expect(response.data.seller_member.permissions).toEqual(
          expect.objectContaining({ reviews: "edit", messages: "edit", store: "view" })
        )
        expect(response.data.seller_member.permissions.payouts).toBeUndefined()
      })

      it("answers a denial in the caller's language", async () => {
        const headers = memberHeaders()
        const denied = await api
          .get("/vendor/payouts", { headers: { ...headers.headers, "accept-language": "tr" } })
          .catch((error) => error.response)
        expect(denied.status).toEqual(403)
        expect(denied.data.code).toEqual("MISSING_PERMISSION")
        expect(denied.data.message).toEqual("Bu işlemi gerçekleştirme izniniz yok.")
      })

      it("guards role changes", async () => {
        const { data: ownerRows } = await container
          .resolve(ContainerRegistrationKeys.QUERY)
          .graph({
            entity: "seller_member",
            fields: ["id"],
            filters: { seller_id: owner.seller.id, member_id: owner.member.id },
          })
        const ownerSellerMemberId = ownerRows[0].id

        const supportTries = await api
          .post(
            `/vendor/sellers/${owner.seller.id}/members/${sellerMemberId}`,
            { role_id: SellerRole.SELLER_ADMINISTRATION },
            memberHeaders()
          )
          .catch((error) => error.response)
        expect(supportTries.status).toEqual(403)

        await setRole(SellerRole.SELLER_ADMINISTRATION)

        const self = await api
          .post(
            `/vendor/sellers/${owner.seller.id}/members/${sellerMemberId}`,
            { role_id: SellerRole.SUPPORT },
            memberHeaders()
          )
          .catch((error) => error.response)
        expect(self.status).toEqual(400)

        const ownerRole = await api
          .post(
            `/vendor/sellers/${owner.seller.id}/members/${ownerSellerMemberId}`,
            { role_id: SellerRole.SUPPORT },
            memberHeaders()
          )
          .catch((error) => error.response)
        expect(ownerRole.status).toEqual(400)

        const removeOwner = await api
          .delete(
            `/vendor/sellers/${owner.seller.id}/members/${ownerSellerMemberId}`,
            memberHeaders()
          )
          .catch((error) => error.response)
        expect(removeOwner.status).toEqual(400)

        const ownerAfter = await api.get("/vendor/payouts", owner.headers)
        expect(ownerAfter.status).toEqual(200)
      })
    })
  },
})
