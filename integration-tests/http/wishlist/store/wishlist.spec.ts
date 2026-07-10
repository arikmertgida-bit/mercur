import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
    ISalesChannelModuleService,
    MedusaContainer,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { MercurModules, SellerStatus } from "@mercurjs/types"
import { createCustomerUser } from "../../../helpers/create-customer-user"
import { createSellerUser } from "../../../helpers/create-seller-user"
import { createVendorProduct } from "../../../helpers/create-product"
import {
    generatePublishableKey,
    generateStoreHeaders,
} from "../../../helpers/create-admin-user"

type SellerModuleLike = {
    updateSellers: (input: { id: string; status: SellerStatus }) => Promise<unknown>
}

const approveSeller = async (
    container: MedusaContainer,
    sellerId: string
): Promise<void> => {
    const sellerModule = container.resolve<SellerModuleLike>(MercurModules.SELLER)
    await sellerModule.updateSellers({ id: sellerId, status: SellerStatus.OPEN })
}

jest.setTimeout(120000)

medusaIntegrationTestRunner({
    testSuite: ({ getContainer, api }) => {
        describe("Store - Wishlist", () => {
            let appContainer: MedusaContainer
            let storeHeaders: Record<string, string>
            let storeAuthHeaders: Record<string, string>

            const seedProduct = async (title: string): Promise<string> => {
                const tag = `${Date.now()}-${Math.random()}`
                const seller = await createSellerUser(appContainer, {
                    email: `wishlist-seller-${tag}@medusa.js`,
                    name: `Wishlist Test Seller ${tag}`,
                })
                await approveSeller(appContainer, seller.seller.id)

                const product = await createVendorProduct(api, seller.headers, {
                    title,
                    status: "published",
                })

                return product.id
            }

            beforeEach(async () => {
                appContainer = getContainer()

                const salesChannelModule =
                    appContainer.resolve<ISalesChannelModuleService>(
                        Modules.SALES_CHANNEL
                    )
                const salesChannel = await salesChannelModule.createSalesChannels({
                    name: `Wishlist Test Store ${Date.now()}-${Math.random()}`,
                })

                const publishableKey = await generatePublishableKey(appContainer)
                const generatedStoreHeaders = generateStoreHeaders({ publishableKey })
                storeHeaders = generatedStoreHeaders.headers

                const link = appContainer.resolve(ContainerRegistrationKeys.LINK)
                await link.create({
                    [Modules.API_KEY]: {
                        publishable_key_id: publishableKey.id,
                    },
                    [Modules.SALES_CHANNEL]: {
                        sales_channel_id: salesChannel.id,
                    },
                })

                const customer = await createCustomerUser(appContainer, {
                    email: `wishlist-customer-${Date.now()}-${Math.random()}@medusa.js`,
                })

                storeAuthHeaders = {
                    ...storeHeaders,
                    ...customer.headers.headers,
                }
            })

            it("creates a wishlist on first add and returns the product on GET", async () => {
                const productId = await seedProduct("Wishlist Product One")

                const createRes = await api.post(
                    "/store/wishlist",
                    { reference: "product", reference_id: productId },
                    { headers: storeAuthHeaders }
                )

                expect(createRes.status).toBe(201)
                expect(createRes.data.wishlist).toBeTruthy()

                const listRes = await api.get("/store/wishlist", {
                    headers: storeAuthHeaders,
                })

                expect(listRes.status).toBe(200)
                const productIds: string[] = listRes.data.products.map(
                    (product: { id: string }) => product.id
                )
                expect(productIds).toContain(productId)
            })

            it("reuses the same wishlist for a second product from the same customer", async () => {
                const firstProductId = await seedProduct("Wishlist Product Two")
                const secondProductId = await seedProduct("Wishlist Product Three")

                const firstRes = await api.post(
                    "/store/wishlist",
                    { reference: "product", reference_id: firstProductId },
                    { headers: storeAuthHeaders }
                )
                const secondRes = await api.post(
                    "/store/wishlist",
                    { reference: "product", reference_id: secondProductId },
                    { headers: storeAuthHeaders }
                )

                expect(firstRes.data.wishlist.id).toBe(secondRes.data.wishlist.id)

                const listRes = await api.get("/store/wishlist", {
                    headers: storeAuthHeaders,
                })
                const productIds: string[] = listRes.data.products.map(
                    (product: { id: string }) => product.id
                )
                expect(productIds).toEqual(
                    expect.arrayContaining([firstProductId, secondProductId])
                )
            })

            it("removes a product from the wishlist on DELETE", async () => {
                const productId = await seedProduct("Wishlist Product Four")

                await api.post(
                    "/store/wishlist",
                    { reference: "product", reference_id: productId },
                    { headers: storeAuthHeaders }
                )

                const deleteRes = await api.delete(
                    `/store/wishlist/product/${productId}`,
                    { headers: storeAuthHeaders }
                )

                expect(deleteRes.status).toBe(200)
                expect(deleteRes.data.deleted).toBe(true)

                const listRes = await api.get("/store/wishlist", {
                    headers: storeAuthHeaders,
                })
                const productIds: string[] = listRes.data.products.map(
                    (product: { id: string }) => product.id
                )
                expect(productIds).not.toContain(productId)
            })

            it("returns 404 when deleting from a wishlist that does not exist yet", async () => {
                const productId = await seedProduct("Wishlist Product Five")

                await expect(
                    api.delete(`/store/wishlist/product/${productId}`, {
                        headers: storeAuthHeaders,
                    })
                ).rejects.toMatchObject({
                    response: { status: 404 },
                })
            })

            it("rejects requests without a valid customer session", async () => {
                await expect(
                    api.get("/store/wishlist", { headers: storeHeaders })
                ).rejects.toMatchObject({
                    response: { status: 401 },
                })
            })
        })
    },
})
