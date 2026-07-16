import {
    IAuthModuleService,
    MedusaContainer,
} from "@medusajs/framework/types"
import {
    ContainerRegistrationKeys,
    Modules,
} from "@medusajs/framework/utils"
import Scrypt from "scrypt-kdf"
import {
    approveSellerWorkflow,
    createSellerAccountWorkflow,
} from "@mercurjs/core/workflows"

export const vendorHeaders = {
    headers: { "x-medusa-access-token": "test_token" },
}

export const createSellerUser = async (
    container: MedusaContainer,
    options?: { email?: string; name?: string; autoApprove?: boolean }
) => {
    const email = options?.email ?? "seller@medusa.js"
    const name = options?.name ?? "Test Seller"

    const authModule: IAuthModuleService = container.resolve(Modules.AUTH)

    // Low scrypt work factor: this is throwaway test data, and the helper runs
    // on every seller-creating spec. scrypt-kdf embeds the params in the hash,
    // so emailpass login still verifies against the cheaper cost factor.
    const hashConfig = { logN: 4, r: 8, p: 1 }
    const passwordHash = await Scrypt.kdf("somepassword", hashConfig)

    const authIdentity = await authModule.createAuthIdentities({
        provider_identities: [
            {
                provider: "emailpass",
                entity_id: email,
                provider_metadata: {
                    password: passwordHash.toString("base64"),
                },
            },
        ],
    })

    const { result: seller } = await createSellerAccountWorkflow(container).run({
        input: {
            auth_identity_id: authIdentity.id,
            member_email: email,
            seller: {
                name,
                email,
                currency_code: "usd",
            },
        },
    })

    // New sellers start `pending_approval`; in real usage the
    // `auto-approve-seller` subscriber flips this to `open` shortly after
    // the `seller.created` event fires, but that happens on the event bus's
    // own schedule (fire-and-forget, not awaited by this workflow — see
    // `event-bus-local`'s `groupOrEmitEvent`). A caller that needs an
    // already-open seller right away (e.g. to immediately create a vendor
    // product) can't rely on that timing and must ask for it explicitly
    // here, via the same real workflow the subscriber runs — not a delay.
    if (options?.autoApprove) {
        await approveSellerWorkflow(container).run({
            input: { seller_id: seller.id },
        })
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: members } = await query.graph({
        entity: "member",
        fields: ["id"],
        filters: { email },
    })

    const member = members[0]

    const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
    const { projectConfig } = config
    const { jwtSecret, jwtOptions } = projectConfig.http
    const token = (await import("jsonwebtoken")).default.sign(
        {
            actor_id: member.id,
            actor_type: "member",
            auth_identity_id: authIdentity.id,
        },
        jwtSecret,
        {
            expiresIn: "1d",
            ...jwtOptions,
        }
    )

    vendorHeaders.headers["authorization"] = `Bearer ${token}`
    vendorHeaders.headers["x-seller-id"] = seller.id

    const headers = {
        headers: {
            authorization: `Bearer ${token}`,
            "x-seller-id": seller.id,
        },
    }

    return { seller, member, authIdentity, headers }
}
