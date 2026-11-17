import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
    ICustomerModuleService,
    IOrderModuleService,
    MedusaContainer,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

import { createCustomerUser } from "../../../helpers/create-customer-user"
import {
    generatePublishableKey,
    generateStoreHeaders,
} from "../../../helpers/create-admin-user"

jest.setTimeout(120000)

type RequestHeaders = { headers: Record<string, string> }

const withHeaders = (
    base: RequestHeaders,
    extra?: RequestHeaders
): RequestHeaders => ({ headers: { ...base.headers, ...(extra?.headers ?? {}) } })

medusaIntegrationTestRunner({
    testSuite: ({ getContainer, api }) => {
        describe("Store - order detail access", () => {
            let container: MedusaContainer
            let storeHeaders: RequestHeaders
            let ownerHeaders: RequestHeaders
            let otherHeaders: RequestHeaders
            let registeredOrderId: string
            let guestOrderId: string

            const createOrder = async (
                customerId: string,
                email: string
            ): Promise<string> => {
                const orderModule = container.resolve<IOrderModuleService>(Modules.ORDER)
                const [order] = await orderModule.createOrders([
                    {
                        currency_code: "try",
                        email,
                        customer_id: customerId,
                        shipping_address: {
                            first_name: "Ayşe",
                            last_name: "Yılmaz",
                            address_1: "Atatürk Cd. 1",
                            city: "İstanbul",
                            country_code: "tr",
                            postal_code: "34000",
                            phone: "5550000000",
                        },
                        items: [{ title: "Ürün", quantity: 1, unit_price: 100 }],
                    },
                ])
                return order.id
            }

            beforeEach(async () => {
                container = getContainer()
                const customerModule = container.resolve<ICustomerModuleService>(Modules.CUSTOMER)

                const owner = await createCustomerUser(container, { email: "owner@kayi.test" })
                const other = await createCustomerUser(container, { email: "other@kayi.test" })
                await customerModule.updateCustomers(owner.customer.id, { has_account: true })
                await customerModule.updateCustomers(other.customer.id, { has_account: true })

                const guest = await customerModule.createCustomers({ email: "guest@kayi.test" })

                const apiKey = await generatePublishableKey(container)
                storeHeaders = generateStoreHeaders({ publishableKey: apiKey })
                ownerHeaders = withHeaders(storeHeaders, owner.headers)
                otherHeaders = withHeaders(storeHeaders, other.headers)

                registeredOrderId = await createOrder(owner.customer.id, "owner@kayi.test")
                guestOrderId = await createOrder(guest.id, "guest@kayi.test")
            })

            it("hides a registered customer's order from anonymous requests", async () => {
                const res = await api
                    .get(`/store/orders/${registeredOrderId}`, storeHeaders)
                    .catch((e) => e.response)

                expect(res.status).toEqual(404)
                expect(JSON.stringify(res.data)).not.toContain("owner@kayi.test")
            })

            it("hides a registered customer's order from another customer", async () => {
                const res = await api
                    .get(`/store/orders/${registeredOrderId}`, otherHeaders)
                    .catch((e) => e.response)

                expect(res.status).toEqual(404)
            })

            it("returns the order to its owner", async () => {
                const res = await api.get(`/store/orders/${registeredOrderId}`, ownerHeaders)

                expect(res.status).toEqual(200)
                expect(res.data.order.id).toEqual(registeredOrderId)
                expect(res.data.order.email).toEqual("owner@kayi.test")
            })

            it("keeps guest orders readable by id", async () => {
                const res = await api.get(`/store/orders/${guestOrderId}`, storeHeaders)

                expect(res.status).toEqual(200)
                expect(res.data.order.id).toEqual(guestOrderId)
            })
        })

        describe("Store - customer uploads ownership", () => {
            let container: MedusaContainer
            let ownerHeaders: RequestHeaders
            let otherHeaders: RequestHeaders
            let storeHeaders: RequestHeaders

            // 1x1 transparent PNG
            const PNG = Buffer.from(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
                "base64"
            )

            const upload = async (headers: RequestHeaders): Promise<{ id: string; url: string }> => {
                const form = new FormData()
                form.append("files", new Blob([PNG], { type: "image/png" }), "avatar.png")
                const res = await api.post("/store/customer/upload", form, headers)
                expect(res.status).toEqual(200)
                return res.data.files[0]
            }

            beforeEach(async () => {
                container = getContainer()
                const owner = await createCustomerUser(container, { email: "up-owner@kayi.test" })
                const other = await createCustomerUser(container, { email: "up-other@kayi.test" })
                const apiKey = await generatePublishableKey(container)
                storeHeaders = generateStoreHeaders({ publishableKey: apiKey })
                ownerHeaders = withHeaders(storeHeaders, owner.headers)
                otherHeaders = withHeaders(storeHeaders, other.headers)
            })

            it("lets a customer delete only their own upload", async () => {
                const file = await upload(ownerHeaders)

                const foreign = await api
                    .delete("/store/customer/upload", { ...otherHeaders, data: { fileId: file.id } })
                    .catch((e) => e.response)
                expect(foreign.status).toEqual(404)

                const notACustomerFile = await api
                    .delete("/store/customer/upload", {
                        ...ownerHeaders,
                        data: { fileId: "seller-logo-01ABC.png" },
                    })
                    .catch((e) => e.response)
                expect(notACustomerFile.status).toEqual(404)

                const own = await api.delete("/store/customer/upload", {
                    ...ownerHeaders,
                    data: { fileId: file.id },
                })
                expect(own.status).toEqual(200)
            })

            it("rejects review images from anonymous requests", async () => {
                const res = await api
                    .post(
                        "/store/review-images",
                        { review_id: "rev_x", urls: ["https://tracker.example/p.png"] },
                        storeHeaders
                    )
                    .catch((e) => e.response)

                expect(res.status).toEqual(401)
            })
        })

        describe("Store - reports require a customer", () => {
            let storeHeaders: RequestHeaders
            let customerHeaders: RequestHeaders

            beforeEach(async () => {
                const container = getContainer()
                const customer = await createCustomerUser(container, { email: "reporter@kayi.test" })
                const apiKey = await generatePublishableKey(container)
                storeHeaders = generateStoreHeaders({ publishableKey: apiKey })
                customerHeaders = withHeaders(storeHeaders, customer.headers)
            })

            it("rejects anonymous product and review-image reports", async () => {
                const product = await api
                    .post(
                        "/store/product-reports/prod_x/report",
                        { reason: "other", comment: "spam" },
                        storeHeaders
                    )
                    .catch((e) => e.response)
                expect(product.status).toEqual(401)

                const image = await api
                    .post("/store/review-images/rimg_x/report", { reason: "spam" }, storeHeaders)
                    .catch((e) => e.response)
                expect(image.status).toEqual(401)
            })

            it("rejects a report for a product that does not exist", async () => {
                const res = await api
                    .post(
                        "/store/product-reports/prod_missing/report",
                        { reason: "other", comment: "spam" },
                        customerHeaders
                    )
                    .catch((e) => e.response)
                expect(res.status).toEqual(404)
            })
        })
    },
})
