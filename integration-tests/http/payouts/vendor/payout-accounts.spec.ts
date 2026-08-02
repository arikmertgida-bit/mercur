import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/framework/types"
import { MercurModules } from "@mercurjs/types"
import { SystemPayoutProvider } from "@mercurjs/core/modules/payout/providers"
import { createSellerUser } from "../../../helpers/create-seller-user"

jest.setTimeout(60000)

type RequestHeaders = { headers: Record<string, string> }

type PayoutAccountModuleLike = {
  updatePayoutAccounts: (
    data: { id: string; data: Record<string, unknown> }
  ) => Promise<unknown>
}

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("Vendor - Payout Accounts", () => {
      let appContainer: MedusaContainer
      let sellerAHeaders: RequestHeaders
      let sellerBHeaders: RequestHeaders
      let sellerAAccountId: string

      beforeAll(async () => {
        appContainer = getContainer()
      })

      beforeEach(async () => {
        const resultA = await createSellerUser(appContainer, {
          email: "payout-account-seller-a@test.com",
          name: "Payout Account Seller A",
        })
        sellerAHeaders = resultA.headers

        const resultB = await createSellerUser(appContainer, {
          email: "payout-account-seller-b@test.com",
          name: "Payout Account Seller B",
        })
        sellerBHeaders = resultB.headers

        const createResponse = await api.post(
          `/vendor/payout-accounts`,
          { data: {}, context: {} },
          sellerAHeaders
        )
        sellerAAccountId = createResponse.data.payout_account.id

        // Simulate what a real provider (e.g. Stripe Connect) persists after
        // account creation: an `id` in `data` that identifies the connected
        // account with the provider. The bundled SystemPayoutProvider used in
        // this environment stores `{}`, so this is seeded directly to exercise
        // the same code path a Stripe-backed deployment would hit.
        const payoutAccountService =
          appContainer.resolve<PayoutAccountModuleLike>(MercurModules.PAYOUT)
        await payoutAccountService.updatePayoutAccounts({
          id: sellerAAccountId,
          data: { id: "acct_seller_a_real_provider_id" },
        })
      })

      it("does not let a seller's onboarding request override the persisted provider account id", async () => {
        const spy = jest.spyOn(
          SystemPayoutProvider.prototype,
          "createOnboarding"
        )

        const response = await api.post(
          `/vendor/payout-accounts/${sellerAAccountId}/onboarding`,
          {
            data: {
              id: "acct_attacker_injected",
              refresh_url: "https://example.com/refresh",
              return_url: "https://example.com/return",
            },
            context: {},
          },
          sellerAHeaders
        )

        expect(response.status).toEqual(201)
        expect(spy).toHaveBeenCalledTimes(1)

        const [callArg] = spy.mock.calls[0]
        expect(callArg.data?.id).toEqual("acct_seller_a_real_provider_id")
        expect(callArg.data?.refresh_url).toEqual("https://example.com/refresh")
        expect(callArg.data?.return_url).toEqual("https://example.com/return")

        spy.mockRestore()
      })

      it("returns 404 when a seller tries to start onboarding on another seller's payout account", async () => {
        await expect(
          api.post(
            `/vendor/payout-accounts/${sellerAAccountId}/onboarding`,
            { data: {}, context: {} },
            sellerBHeaders
          )
        ).rejects.toMatchObject({
          response: { status: 404 },
        })
      })

      it("returns 404 when a seller tries to read another seller's payout account by id", async () => {
        await expect(
          api.get(
            `/vendor/payout-accounts/${sellerAAccountId}`,
            sellerBHeaders
          )
        ).rejects.toMatchObject({
          response: { status: 404 },
        })
      })

      it("never lists another seller's payout account", async () => {
        const response = await api.get(`/vendor/payout-accounts`, sellerBHeaders)

        const ids = (
          response.data.payout_accounts as { id: string }[]
        ).map((a) => a.id)
        expect(ids).not.toContain(sellerAAccountId)
      })
    })
  },
})
