import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/framework/types"

import { createSellerUser } from "../../../helpers/create-seller-user"

jest.setTimeout(60000)

type RequestHeaders = { headers: Record<string, string> }

const promotionBody = (isAutomatic: boolean, campaignId?: string) => ({
    type: "standard",
    status: "active",
    is_automatic: isAutomatic,
    ...(campaignId ? { campaign_id: campaignId } : {}),
    application_method: {
        type: "percentage",
        target_type: "items",
        allocation: "each",
        value: 10,
        max_quantity: 1,
        target_rules: [],
    },
})

medusaIntegrationTestRunner({
    testSuite: ({ getContainer, api }) => {
        describe("Vendor - per-customer campaign budgets", () => {
            let container: MedusaContainer
            let headers: RequestHeaders
            let campaignId: string

            beforeEach(async () => {
                container = getContainer()
                const seller = await createSellerUser(container, {
                    email: "budget-seller@test.com",
                    name: "Budget Seller",
                })
                headers = seller.headers

                const campaign = await api.post(
                    `/vendor/campaigns`,
                    {
                        name: "Per Customer",
                        campaign_identifier: "per-customer",
                        budget: { type: "use_by_attribute", attribute: "customer_id", limit: 1 },
                    },
                    headers
                )
                campaignId = campaign.data.campaign.id
            })

            it("accepts a code promotion in a per-customer campaign", async () => {
                const response = await api
                    .post(`/vendor/promotions`, promotionBody(false, campaignId), headers)
                    .catch((e) => e.response)

                expect({ status: response.status, data: response.data }).toMatchObject({
                    status: 200,
                    data: { promotion: { campaign_id: campaignId } },
                })
            })

            it("rejects an automatic promotion in a per-customer campaign and keeps nothing", async () => {
                const response = await api
                    .post(`/vendor/promotions`, promotionBody(true, campaignId), headers)
                    .catch((e) => e.response)

                expect({ status: response.status, data: response.data }).toMatchObject({
                    status: 400,
                    data: { code: "automatic_promotion_attribute_budget" },
                })

                const list = await api.get(`/vendor/promotions?fields=id,campaign_id`, headers)
                expect(list.data.promotions).toHaveLength(0)
            })

            it("rejects turning a campaign's code promotion automatic", async () => {
                const created = await api.post(`/vendor/promotions`, promotionBody(false, campaignId), headers)

                const response = await api
                    .post(`/vendor/promotions/${created.data.promotion.id}`, { is_automatic: true }, headers)
                    .catch((e) => e.response)

                expect({ status: response.status, data: response.data }).toMatchObject({
                    status: 400,
                    data: { code: "automatic_promotion_attribute_budget" },
                })
            })

            it("rejects adding an automatic promotion to the campaign", async () => {
                const automatic = await api.post(`/vendor/promotions`, promotionBody(true), headers)

                const response = await api
                    .post(
                        `/vendor/campaigns/${campaignId}/promotions`,
                        { add: [automatic.data.promotion.id] },
                        headers
                    )
                    .catch((e) => e.response)

                expect({ status: response.status, data: response.data }).toMatchObject({
                    status: 400,
                    data: { code: "automatic_promotion_attribute_budget" },
                })
            })

            it("rejects a budget attribute Medusa cannot evaluate", async () => {
                const response = await api
                    .post(
                        `/vendor/campaigns`,
                        {
                            name: "Per Code",
                            campaign_identifier: "per-code",
                            budget: { type: "use_by_attribute", attribute: "promotion_code", limit: 1 },
                        },
                        headers
                    )
                    .catch((e) => e.response)

                expect(response.status).toEqual(400)
            })
        })
    },
})
