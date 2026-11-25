import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { IAuthModuleService, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { MercurModules } from "@mercurjs/types"
import jwt from "jsonwebtoken"
import { createSellerUser } from "../../../helpers/create-seller-user"
import { ensureVendorShippingProfile } from "../../../helpers/create-product"

jest.setTimeout(80000)

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
)
const EXTERNAL = "https://tracker.example.org/pixel.png"

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("Vendor - own images and member invites", () => {
      let appContainer: MedusaContainer
      let seller1: Awaited<ReturnType<typeof createSellerUser>>
      let seller2: Awaited<ReturnType<typeof createSellerUser>>
      const previousFileUrl = process.env.MINIO_FILE_URL

      const upload = async (headers: { headers: Record<string, string> }) => {
        const form = new FormData()
        form.append("files", new Blob([PNG], { type: "image/png" }), "proof.png")
        const response = await api.post("/vendor/uploads", form, headers)
        expect(response.status).toBe(200)
        const url: string = response.data.files[0].url
        // The test app stores files with Medusa's local provider; point the
        // ownership check at wherever it serves them.
        process.env.MINIO_FILE_URL = url.slice(0, url.lastIndexOf("/"))
        return url
      }

      const failure = async (request: Promise<unknown>) =>
        request.then(
          () => ({ status: 200, data: { code: "" } }),
          (error) => error.response
        )

      const signFor = (authIdentityId: string, actorId: string) => {
        const { jwtSecret } = appContainer.resolve(
          ContainerRegistrationKeys.CONFIG_MODULE
        ).projectConfig.http
        return {
          headers: {
            authorization: `Bearer ${jwt.sign(
              { actor_id: actorId, actor_type: "member", auth_identity_id: authIdentityId },
              `${jwtSecret}`,
              { expiresIn: "1h" }
            )}`,
          },
        }
      }

      const inviteToken = async (sellerId: string, email: string) => {
        const service = appContainer.resolve(MercurModules.SELLER)
        const [invite] = await service.listMemberInvites(
          { seller_id: sellerId, email },
          { select: ["token"] }
        )
        return invite.token as string
      }

      beforeAll(async () => {
        appContainer = getContainer()
      })

      afterAll(() => {
        process.env.MINIO_FILE_URL = previousFileUrl
      })

      beforeEach(async () => {
        seller1 = await createSellerUser(appContainer, {
          email: "seller1@test.com",
          name: "Seller One",
        })
        seller2 = await createSellerUser(appContainer, {
          email: "seller2@test.com",
          name: "Seller Two",
        })
      })

      it("keys uploads to the seller and accepts only its own images", async () => {
        const own = await upload(seller1.headers)
        const foreign = await upload(seller2.headers)
        expect(decodeURIComponent(own)).toContain(`seller-${seller1.seller.id}--`)

        const path = `/vendor/sellers/${seller1.seller.id}`
        for (const logo of [EXTERNAL, foreign]) {
          const denied = await failure(api.post(path, { logo }, seller1.headers))
          expect(denied.status).toBe(400)
          expect(denied.data.code).toBe("seller_image_not_owned")
        }

        const saved = await api.post(path, { logo: own, banner: null }, seller1.headers)
        expect(saved.status).toBe(200)
        // An unchanged value keeps saving even though it is not re-uploaded.
        const again = await api.post(path, { logo: own }, seller1.headers)
        expect(again.status).toBe(200)

        const badSite = await failure(
          api.post(path, { website_url: "javascript:alert(1)" }, seller1.headers)
        )
        expect(badSite.status).toBe(400)
      })

      it("rejects foreign image URLs on products", async () => {
        const own = await upload(seller1.headers)
        const profile1 = await ensureVendorShippingProfile(api, seller1.headers)
        const profile2 = await ensureVendorShippingProfile(api, seller2.headers)
        const body = (
          images: string[],
          thumbnail?: string,
          shipping_profile_id = profile1
        ) => ({
          title: "Image proof",
          shipping_profile_id,
          thumbnail,
          images: images.map((url) => ({ url })),
          variants: [{ title: "Default" }],
        })

        const denied = await failure(
          api.post("/vendor/products", body([own, EXTERNAL]), seller1.headers)
        )
        expect(denied.status).toBe(400)
        expect(denied.data.code).toBe("seller_image_not_owned")

        const created = await api
          .post("/vendor/products", body([own], own), seller1.headers)
          .catch((error) => {
            throw new Error(JSON.stringify(error.response?.data))
          })
        const product = created.data.product

        const update = await failure(
          api.post(
            `/vendor/products/${product.id}`,
            { thumbnail: EXTERNAL },
            seller1.headers
          )
        )
        expect(update.status).toBe(400)

        const foreignSeller = await failure(
          api.post(
            "/vendor/products",
            body([own], undefined, profile2),
            seller2.headers
          )
        )
        expect(foreignSeller.status).toBe(400)
        expect(foreignSeller.data.code).toBe("seller_image_not_owned")
      })

      it("never returns the invite token and binds acceptance to the invited email", async () => {
        const created = await api.post(
          `/vendor/sellers/${seller1.seller.id}/members`,
          { email: "seller2@test.com", role_id: "role_seller_support" },
          seller1.headers
        )
        expect(created.status).toBe(201)
        expect(created.data.member_invite.token).toBeUndefined()

        const token = await inviteToken(seller1.seller.id, "seller2@test.com")
        const authModule = appContainer.resolve<IAuthModuleService>(Modules.AUTH)

        // A fresh login under another email must not take over seller2's member.
        const stranger = await authModule.createAuthIdentities({
          provider_identities: [{ provider: "emailpass", entity_id: "stranger@test.com" }],
        })
        const takeover = await failure(
          api.post(
            "/vendor/members/invites/accept",
            { invite_token: token },
            signFor(stranger.id, "")
          )
        )
        expect(takeover.status).toBe(400)
        expect(takeover.data.code).toBe("member_invite_email_mismatch")

        // Logged in as a different existing member: also refused.
        const wrongMember = await failure(
          api.post(
            "/vendor/members/invites/accept",
            { invite_token: token },
            signFor(seller1.authIdentity.id, seller1.member.id)
          )
        )
        expect(wrongMember.data.code).toBe("member_invite_email_mismatch")

        // The invited member, logged in, accepts.
        const accepted = await api.post(
          "/vendor/members/invites/accept",
          { invite_token: token },
          signFor(seller2.authIdentity.id, seller2.member.id)
        )
        expect(accepted.status).toBe(200)
        expect(accepted.data.member.id).toBe(seller2.member.id)
      })

      it("lets a brand-new member accept with an identity under the invited email", async () => {
        await api.post(
          `/vendor/sellers/${seller1.seller.id}/members`,
          { email: "newcomer@test.com", role_id: "role_seller_support" },
          seller1.headers
        )
        const token = await inviteToken(seller1.seller.id, "newcomer@test.com")
        const authModule = appContainer.resolve<IAuthModuleService>(Modules.AUTH)

        const other = await authModule.createAuthIdentities({
          provider_identities: [{ provider: "emailpass", entity_id: "other@test.com" }],
        })
        const denied = await failure(
          api.post(
            "/vendor/members/invites/accept",
            { invite_token: token },
            signFor(other.id, "")
          )
        )
        expect(denied.data.code).toBe("member_invite_email_mismatch")

        const newcomer = await authModule.createAuthIdentities({
          provider_identities: [{ provider: "emailpass", entity_id: "newcomer@test.com" }],
        })
        const accepted = await api.post(
          "/vendor/members/invites/accept",
          { invite_token: token },
          signFor(newcomer.id, "")
        )
        expect(accepted.status).toBe(200)
      })
    })
  },
})
