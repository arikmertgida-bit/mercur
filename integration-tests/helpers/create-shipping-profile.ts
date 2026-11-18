import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { MercurModules } from "@mercurjs/types"

/**
 * Shipping profiles are seller-owned in Kayı (one seller per profile). Seeds
 * a profile through the fulfillment module and links it to `seller_id`.
 * Without one, the only seller of the test is used; specs with several
 * sellers must say which one owns the profile. `seller_id: null` leaves the
 * profile unowned (an operator profile no seller can see or use).
 */
export const createShippingProfile = async (
    container: MedusaContainer,
    data: { name: string; type?: string },
    options?: { seller_id?: string | null }
) => {
    const fulfillmentModule: any = container.resolve(Modules.FULFILLMENT)

    const [shippingProfile] = await fulfillmentModule.createShippingProfiles([
        { type: "default", ...data },
    ])

    let sellerId = options?.seller_id
    if (sellerId === undefined) {
        const sellerModule: any = container.resolve(MercurModules.SELLER)
        const sellers = await sellerModule.listSellers({}, { select: ["id"] })
        if (sellers.length !== 1) {
            throw new Error(
                `createShippingProfile: ${sellers.length} sellers exist, pass options.seller_id`
            )
        }
        sellerId = sellers[0].id
    }

    if (sellerId) {
        const link: any = container.resolve(ContainerRegistrationKeys.LINK)
        await link.create({
            [Modules.FULFILLMENT]: { shipping_profile_id: shippingProfile.id },
            [MercurModules.SELLER]: { seller_id: sellerId },
        })
    }

    return shippingProfile
}
