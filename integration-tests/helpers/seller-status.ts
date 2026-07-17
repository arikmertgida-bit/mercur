import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateSellersWorkflow } from "@mercurjs/core/workflows"
import { SellerStatus } from "@mercurjs/types"

const AUTO_APPROVE_POLL_INTERVAL_MS = 25
const AUTO_APPROVE_POLL_TIMEOUT_MS = 5000

const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms))

const waitForSellerStatus = async (
    container: MedusaContainer,
    sellerId: string,
    status: SellerStatus,
    timeoutMs: number
): Promise<boolean> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
        const { data: sellers } = await query.graph({
            entity: "seller",
            fields: ["id", "status"],
            filters: { id: sellerId },
        })

        if (sellers[0]?.status === status) {
            return true
        }

        await sleep(AUTO_APPROVE_POLL_INTERVAL_MS)
    }

    return false
}

/**
 * `auto-approve-seller` races every freshly created seller to `open` on
 * its own event-bus schedule (fire-and-forget — the creating workflow
 * never awaits it, see `event-bus-local`'s `groupOrEmitEvent`). A test that
 * deliberately needs a seller sitting in `pending_approval` can't just skip
 * approving it: the subscriber gets there anyway, non-deterministically,
 * sometimes before the test's own assertions run and sometimes after.
 *
 * This polls until that one-shot subscriber run has actually landed (so
 * there is no longer anything async in flight for this seller), then
 * forces the seller back to `pending_approval` through the same public
 * `updateSellersWorkflow` the admin "edit seller" endpoint uses — not a
 * blind delay, and not raw SQL.
 */
export const ensureSellerPendingApproval = async (
    container: MedusaContainer,
    sellerId: string
): Promise<void> => {
    await waitForSellerStatus(
        container,
        sellerId,
        SellerStatus.OPEN,
        AUTO_APPROVE_POLL_TIMEOUT_MS
    )

    await updateSellersWorkflow(container).run({
        input: {
            selector: { id: sellerId },
            update: {
                status: SellerStatus.PENDING_APPROVAL,
                status_reason: null,
            },
        },
    })
}
