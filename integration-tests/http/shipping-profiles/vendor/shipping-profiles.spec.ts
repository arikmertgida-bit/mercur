import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/framework/types"
import { createSellerUser } from "../../../helpers/create-seller-user"
import { createShippingProfile } from "../../../helpers/create-shipping-profile"

jest.setTimeout(80000)

medusaIntegrationTestRunner({
    testSuite: ({ getContainer, api }) => {
        describe("Vendor - Shipping Profiles (seller-owned)", () => {
            let appContainer: MedusaContainer
            let seller1Headers: any
            let seller2Headers: any
            let counter = 0

            const expectNotFound = async (request: Promise<any>) => {
                const error = await request.catch((e: any) => e)
                expect(error.response?.status).toBe(404)
            }

            const createProfile = async (headers: any, name: string) => {
                const response = await api.post(
                    `/vendor/shipping-profiles`,
                    { name, type: "default" },
                    headers
                )
                expect(response.status).toBe(201)
                return response.data.shipping_profile
            }

            const createZone = async (headers: any) => {
                const suffix = `_${Date.now()}_${++counter}`
                const { data } = await api.post(
                    `/vendor/stock-locations`,
                    { name: `Warehouse${suffix}` },
                    headers
                )
                const locationId = data.stock_location.id
                await api.post(
                    `/vendor/stock-locations/${locationId}/fulfillment-sets`,
                    { name: `Set${suffix}`, type: "shipping" },
                    headers
                )
                await api.post(
                    `/vendor/stock-locations/${locationId}/fulfillment-providers`,
                    { add: ["manual_manual"] },
                    headers
                )
                const location = await api.get(
                    `/vendor/stock-locations/${locationId}?fields=*fulfillment_sets`,
                    headers
                )
                const setId = location.data.stock_location.fulfillment_sets[0].id
                const zone = await api.post(
                    `/vendor/fulfillment-sets/${setId}/service-zones`,
                    {
                        name: `Zone${suffix}`,
                        geo_zones: [{ type: "country", country_code: "us" }],
                    },
                    headers
                )
                return zone.data.fulfillment_set.service_zones.find(
                    (z: any) => z.name === `Zone${suffix}`
                )
            }

            const optionBody = (zoneId: string, profileId: string) => ({
                name: "Standard",
                service_zone_id: zoneId,
                shipping_profile_id: profileId,
                provider_id: "manual_manual",
                price_type: "flat",
                type: { label: "Standard", description: "Standard", code: "standard" },
                prices: [{ currency_code: "usd", amount: 1000 }],
                rules: [
                    { attribute: "enabled_in_store", operator: "eq", value: "true" },
                    { attribute: "is_return", operator: "eq", value: "false" },
                ],
            })

            beforeAll(async () => {
                appContainer = getContainer()
            })

            beforeEach(async () => {
                const result1 = await createSellerUser(appContainer, {
                    email: "seller1@test.com",
                    name: "Seller One",
                })
                seller1Headers = result1.headers

                const result2 = await createSellerUser(appContainer, {
                    email: "seller2@test.com",
                    name: "Seller Two",
                })
                seller2Headers = result2.headers
            })

            it("lists only the seller's own profiles", async () => {
                const own = await createProfile(seller1Headers, "Own")
                const foreign = await createProfile(seller2Headers, "Foreign")
                const unowned = await createShippingProfile(
                    appContainer,
                    { name: "Operator" },
                    { seller_id: null }
                )

                const response = await api.get(
                    `/vendor/shipping-profiles`,
                    seller1Headers
                )
                const ids = response.data.shipping_profiles.map((p: any) => p.id)

                expect(ids).toEqual([own.id])
                expect(ids).not.toContain(foreign.id)
                expect(ids).not.toContain(unowned.id)
                expect(response.data.count).toBe(1)
            })

            it("reads, updates and deletes only its own profile", async () => {
                const own = await createProfile(seller1Headers, "Own")
                const foreign = await createProfile(seller2Headers, "Foreign")

                const read = await api.get(
                    `/vendor/shipping-profiles/${own.id}`,
                    seller1Headers
                )
                expect(read.data.shipping_profile.name).toBe("Own")

                await expectNotFound(
                    api.get(`/vendor/shipping-profiles/${foreign.id}`, seller1Headers)
                )
                await expectNotFound(
                    api.post(
                        `/vendor/shipping-profiles/${foreign.id}`,
                        { name: "Hijacked" },
                        seller1Headers
                    )
                )
                await expectNotFound(
                    api.delete(`/vendor/shipping-profiles/${foreign.id}`, seller1Headers)
                )

                const stillThere = await api.get(
                    `/vendor/shipping-profiles/${foreign.id}`,
                    seller2Headers
                )
                expect(stillThere.data.shipping_profile.name).toBe("Foreign")

                const renamed = await api.post(
                    `/vendor/shipping-profiles/${own.id}`,
                    { name: "Renamed" },
                    seller1Headers
                )
                expect(renamed.data.shipping_profile.name).toBe("Renamed")

                const deleted = await api.delete(
                    `/vendor/shipping-profiles/${own.id}`,
                    seller1Headers
                )
                expect(deleted.data).toEqual({
                    id: own.id,
                    object: "shipping_profile",
                    deleted: true,
                })
            })

            it("rejects another seller's profile on products", async () => {
                const own = await createProfile(seller1Headers, "Own")
                const foreign = await createProfile(seller2Headers, "Foreign")
                const body = (profileId: string) => ({
                    title: `Product ${++counter}`,
                    shipping_profile_id: profileId,
                    variants: [{ title: "Default" }],
                })

                await expectNotFound(
                    api.post(`/vendor/products`, body(foreign.id), seller1Headers)
                )

                const created = await api.post(
                    `/vendor/products`,
                    body(own.id),
                    seller1Headers
                )
                expect(created.status).toBe(201)

                await expectNotFound(
                    api.post(
                        `/vendor/products/${created.data.product.id}`,
                        { shipping_profile_id: foreign.id },
                        seller1Headers
                    )
                )
            })

            it("keeps shipping options inside the seller's own zones, profiles, rules and prices", async () => {
                const own = await createProfile(seller1Headers, "Own")
                const foreign = await createProfile(seller2Headers, "Foreign")
                const ownZone = await createZone(seller1Headers)
                const foreignZone = await createZone(seller2Headers)

                await expectNotFound(
                    api.post(
                        `/vendor/shipping-options`,
                        optionBody(foreignZone.id, own.id),
                        seller1Headers
                    )
                )
                await expectNotFound(
                    api.post(
                        `/vendor/shipping-options`,
                        optionBody(ownZone.id, foreign.id),
                        seller1Headers
                    )
                )

                const ownOption = (
                    await api.post(
                        `/vendor/shipping-options`,
                        optionBody(ownZone.id, own.id),
                        seller1Headers
                    )
                ).data.shipping_option
                const foreignOption = (
                    await api.post(
                        `/vendor/shipping-options`,
                        optionBody(foreignZone.id, foreign.id),
                        seller2Headers
                    )
                ).data.shipping_option

                const foreignDetail = await api.get(
                    `/vendor/shipping-options/${foreignOption.id}?fields=*rules,*prices`,
                    seller2Headers
                )
                const foreignRule = foreignDetail.data.shipping_option.rules[0]
                const foreignPrice = foreignDetail.data.shipping_option.prices[0]

                await expectNotFound(
                    api.post(
                        `/vendor/shipping-options/${ownOption.id}`,
                        { shipping_profile_id: foreign.id },
                        seller1Headers
                    )
                )
                await expectNotFound(
                    api.post(
                        `/vendor/shipping-options/${ownOption.id}`,
                        { prices: [{ id: foreignPrice.id, amount: 1 }] },
                        seller1Headers
                    )
                )
                await expectNotFound(
                    api.post(
                        `/vendor/shipping-options/${ownOption.id}/rules/batch`,
                        {
                            update: [
                                {
                                    id: foreignRule.id,
                                    attribute: foreignRule.attribute,
                                    operator: "eq",
                                    value: "false",
                                },
                            ],
                        },
                        seller1Headers
                    )
                )
                await expectNotFound(
                    api.post(
                        `/vendor/shipping-options/${ownOption.id}/rules/batch`,
                        { delete: [foreignRule.id] },
                        seller1Headers
                    )
                )

                const after = await api.get(
                    `/vendor/shipping-options/${foreignOption.id}?fields=*rules,*prices`,
                    seller2Headers
                )
                expect(after.data.shipping_option.rules).toHaveLength(
                    foreignDetail.data.shipping_option.rules.length
                )
                expect(
                    after.data.shipping_option.rules.find((r: any) => r.id === foreignRule.id)
                        .value
                ).toBe(foreignRule.value)
                expect(after.data.shipping_option.prices[0].amount).toBe(
                    foreignPrice.amount
                )

                const ownDetail = await api.get(
                    `/vendor/shipping-options/${ownOption.id}?fields=*rules`,
                    seller1Headers
                )
                const ownRule = ownDetail.data.shipping_option.rules.find(
                    (r: any) => r.attribute === "enabled_in_store"
                )
                const toggled = await api.post(
                    `/vendor/shipping-options/${ownOption.id}/rules/batch`,
                    {
                        update: [
                            {
                                id: ownRule.id,
                                attribute: "enabled_in_store",
                                operator: "eq",
                                value: "false",
                            },
                        ],
                    },
                    seller1Headers
                )
                expect(toggled.status).toBe(200)
            })
        })
    },
})
