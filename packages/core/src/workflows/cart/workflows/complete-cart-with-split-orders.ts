import {
    CreateOrderAddressDTO,
    CreateOrderDTO,
    CreateOrderShippingMethodDTO,
    LinkDefinition,
    UsageComputedActions,
} from "@medusajs/framework/types"
import {
    generateEntityId,
    Modules,
    OrderStatus,
    OrderWorkflowEvents,
} from "@medusajs/framework/utils"
import {
    createHook,
    createWorkflow,
    parallelize,
    transform,
    when,
    WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
    acquireLockStep,
    authorizePaymentSessionStep,
    createOrdersStep,
    createRemoteLinkStep,
    emitEventStep,
    releaseLockStep,
    reserveInventoryStep,
    updateCartsStep,
    useQueryGraphStep,
    validateCartPaymentsStep,
} from "@medusajs/medusa/core-flows"
import { CreateOrderGroupDTO, JsonRecord, MercurModules } from "@mercurjs/types"
import { z } from "zod"
import { createOrderGroupStep } from "../../order-group"
import { OrderGroupWorkflowEvents } from "../../events"
import {
    getPromotionSellerIdsStep,
    validateSellerCartItemsStep,
    validateSellerCartShippingStep,
} from "../steps"
import {
    completeCartFields,
    CompleteCartRowSchema,
    isAdjustmentInSellerScope,
    getLineItemSellerId,
    prepareAdjustmentsData,
    PrepareLineItemDataInput,
    prepareLineItemData,
    prepareTaxLinesData,
    prepareVariantInventoryInput,
    requiredVariantFieldsForInventoryConfirmation,
    SellerShippingOptionRow,
    SellerShippingOptionRowSchema,
    VariantInventoryShapeSchema,
} from "../utils"
import { registerUsageStep } from "../../promotion"
import { splitCapturedCartPaymentWorkflow } from "../../payment/workflows/split-order-payments"
import { refreshOrderCommissionLinesWorkflow } from "../../commission/workflows/refresh-order-commission-lines"
import { InventoryWorkflowEvents } from "../../events"
import { AddressRow } from "../../../utils/address-row"
import { parseGraphRow, parseGraphRows } from "../../../utils/graph-rows"

type CompleteCartWithSplitOrdersWorkflowInput = {
    cart_id: string
}

const SetOrderStatusHookResultSchema = z
    .object({
        status: z.enum(OrderStatus).optional(),
        /** Keyed by seller id; takes precedence over `status`. */
        status_by_seller_id: z.record(z.string(), z.enum(OrderStatus)).optional(),
    })
    .optional()

export type SetOrderStatusHookResult = z.infer<typeof SetOrderStatusHookResultSchema>

const OrderGroupRowSchema = z.object({ id: z.string() })

const SellerCustomerLinkRowSchema = z.object({ seller_id: z.string() })

// The cart address columns copied onto the order address, including the
// timestamps the order module accepts beyond `CreateOrderAddressDTO`.
type OrderAddressInput = CreateOrderAddressDTO &
    Pick<AddressRow, "created_at" | "updated_at" | "deleted_at">

const toOrderAddress = (address: AddressRow): OrderAddressInput => {
    const { id: _id, customer_id, ...columns } = address
    return { ...columns, customer_id: customer_id ?? undefined }
}

// The order module persists a shipping method's `description` and
// `metadata` although `CreateOrderShippingMethodDTO` does not declare them.
type OrderShippingMethodInput = Omit<CreateOrderShippingMethodDTO, "order_id"> & {
    description?: string
    metadata?: JsonRecord | null
}

// Workflow `retentionTime` and lock `timeout`/`ttl` are measured in PLAIN
// SECONDS by their respective Medusa APIs (confirmed against
// @medusajs/core-flows' own completeCartWorkflow, which defines its
// equivalent THREE_DAYS as `60 * 60 * 24 * 3`) — never milliseconds. A prior
// `* 1000` here silently inflated the lock's acquire-retry ceiling to ~8.3
// hours, its Redis TTL to ~33 hours, and this workflow's execution-history
// retention to ~8 years — never the intent, and never exercised by a normal
// checkout, only by lock contention or the retention sweep.
export const THREE_DAYS = 60 * 60 * 24 * 3
export const THIRTY_SECONDS = 30
export const TWO_MINUTES = 2 * 60

export const completeCartWithSplitOrdersWorkflow = createWorkflow(
    {
        name: "complete-cart-with-split-orders",
        store: true,
        idempotent: false,
        retentionTime: THREE_DAYS,
    },
    (input: CompleteCartWithSplitOrdersWorkflowInput) => {
        acquireLockStep({
            key: input.cart_id,
            timeout: THIRTY_SECONDS,
            ttl: TWO_MINUTES,
        })

        const [orderGroup, cartData] = parallelize(
            useQueryGraphStep({
                entity: "order_group",
                fields: ["id", "cart_id"],
                filters: { cart_id: input.cart_id },
                options: {
                    isList: false,
                },
            }),
            useQueryGraphStep({
                entity: "cart",
                fields: completeCartFields,
                filters: { id: input.cart_id },
                options: {
                    isList: false,
                },
            }).config({
                name: "cart-query",
            })
        )

        const orderGroupId = transform({ orderGroup }, ({ orderGroup }) => {
            return parseGraphRow(OrderGroupRowSchema.nullish(), orderGroup.data)?.id
        })

        // The raw row goes to the hooks and Medusa's payment validation
        // unchanged; the order split reads the validated fields.
        const cart = transform({ cartData }, ({ cartData }) =>
            parseGraphRow(CompleteCartRowSchema, cartData.data)
        )

        const paymentSessions = validateCartPaymentsStep({ cart: cartData.data })

        const validate = createHook("validate", {
            input,
            cart: cartData.data,
        })

        /**
         * Decides the initial status of the orders this cart splits into, e.g.
         * `REQUIRES_ACTION` when a seller must accept an order before fulfilment.
         * Returning nothing keeps `PENDING`.
         */
        const setOrderStatus = createHook(
            "setOrderStatus",
            {
                cart: cartData.data,
            },
            {
                resultValidator: SetOrderStatusHookResultSchema,
            }
        )

        // PHASE 1 — validate the cart and create (or, under a lost
        // concurrency race, gracefully recover) the order group. Skipped
        // entirely when `orderGroupId` was already found above: the cheap,
        // common path for a plain retry against an already-completed cart.
        const preparedOrderGroup = when("prepare-order-group", { orderGroupId }, ({ orderGroupId }) => {
            return !orderGroupId
        }).then(() => {
            const cartOptionIds = transform({ cart }, ({ cart }) => {
                return (cart.shipping_methods ?? []).flatMap((sm) =>
                    sm.shipping_option_id ? [sm.shipping_option_id] : []
                )
            })
            const shippingOptionsData = useQueryGraphStep({
                entity: "shipping_option",
                fields: ['id', "shipping_profile_id", 'seller.id'],
                filters: { id: cartOptionIds },
                options: {
                    cache: {
                        enable: true,
                    },
                },
            }).config({
                name: "shipping-options-query",
            })
            const shippingOptions = transform(
                { shippingOptionsData },
                ({ shippingOptionsData }) =>
                    parseGraphRows(SellerShippingOptionRowSchema, shippingOptionsData.data)
            )
            validateSellerCartItemsStep({
                cart,
            })
            validateSellerCartShippingStep({
                cart,
                shippingOptions,
            })
            const { sales_channel_id } = transform(
                { cart },
                (data) => {
                    return {
                        sales_channel_id: data.cart.sales_channel_id,
                    }
                }
            )

            const orderStatusResult = setOrderStatus.getResult()

            const cartPromotionIds = transform({ cart }, ({ cart }) => {
                const adjustments = [
                    ...(cart.items ?? []).flatMap((item) => item.adjustments ?? []),
                    ...(cart.shipping_methods ?? []).flatMap((sm) => sm.adjustments ?? []),
                ]
                return { promotion_ids: adjustments.map((adjustment) => adjustment.promotion_id) }
            })

            const promotionSellerIds = getPromotionSellerIdsStep(cartPromotionIds)

            const { ordersToCreate, sellerOrdersMap, variantIdsByOrderId } = transform({ cart, shippingOptions, orderStatusResult, promotionSellerIds }, ({ cart, shippingOptions, orderStatusResult, promotionSellerIds }) => {
                const statusResult = orderStatusResult
                const sellerIdOfPromotion = (promotionId?: string | null) =>
                    promotionId ? (promotionSellerIds[promotionId] ?? null) : null
                const sellerAdjustments = <T extends { promotion_id?: string | null }>(
                    adjustments: T[],
                    sellerId: string
                ) =>
                    adjustments.filter((adjustment) =>
                        isAdjustmentInSellerScope(sellerIdOfPromotion(adjustment.promotion_id), sellerId)
                    )
                const cartSellerIds = new Set<string>(
                    (cart.items ?? [])
                        .map((item) => getLineItemSellerId(item))
                        .filter((id): id is string => typeof id === "string")
                )
                const sellerShippingOptionsMap = new Map<string, SellerShippingOptionRow[]>()
                shippingOptions.forEach((so) => {
                    const sellerId = so.seller.id
                    const previous = sellerShippingOptionsMap.get(sellerId) ?? []
                    sellerShippingOptionsMap.set(sellerId, [...previous, so])
                })

                const sellerOrdersMap: Record<string, string> = {}
                const ordersToCreate: (CreateOrderDTO & { id: string })[] = []
                const variantIdsByOrderId: Record<string, (string | null)[]> = {}

                Array.from(cartSellerIds).map((sellerId) => {
                    const sellerCartItems = (cart.items ?? []).filter(
                        (item) => getLineItemSellerId(item) === sellerId
                    )
                    const sellerShippingOptions = sellerShippingOptionsMap.get(sellerId) ?? []
                    const sellerCartShippingMethods = (cart.shipping_methods ?? []).filter((sm) => sellerShippingOptions.some((so) => so.id === sm.shipping_option_id))

                    const allItems = sellerCartItems.map((item) => {
                        const input: PrepareLineItemDataInput = {
                            item,
                            variant: item.variant,
                            cartId: cart.id,
                            unitPrice: item.unit_price,
                            isTaxInclusive: item.is_tax_inclusive ?? false,
                            taxLines: item.tax_lines ?? [],
                            adjustments: sellerAdjustments(item.adjustments ?? [], sellerId),
                        }
                        return prepareLineItemData(input)
                    })

                    const shippingMethods = sellerCartShippingMethods.map((sm): OrderShippingMethodInput => {
                        return {
                            name: sm.name,
                            description: sm.description ?? undefined,
                            amount: sm.raw_amount ?? sm.amount,
                            is_tax_inclusive: sm.is_tax_inclusive,
                            shipping_option_id: sm.shipping_option_id ?? undefined,
                            data: sm.data ?? undefined,
                            metadata: sm.metadata,
                            tax_lines: prepareTaxLinesData(sm.tax_lines ?? []),
                            adjustments: prepareAdjustmentsData(
                                sellerAdjustments(sm.adjustments ?? [], sellerId)
                            ),
                        }
                    })

                    // todo: add credit lines support for child orders
                    // const creditLines = (cart.credit_lines ?? []).map(
                    //     (creditLine: CartCreditLineDTO) => {
                    //         return {
                    //             amount: creditLine.amount,
                    //             raw_amount: creditLine.raw_amount,
                    //             reference: creditLine.reference,
                    //             reference_id: creditLine.reference_id,
                    //             metadata: creditLine.metadata,
                    //         }
                    //     }
                    // )

                    const itemAdjustments = allItems
                        .map((item) => item.adjustments ?? [])
                        .flat(1)
                    const shippingAdjustments = shippingMethods
                        .map((sm) => sm.adjustments ?? [])
                        .flat(1)

                    const promoCodes = [...itemAdjustments, ...shippingAdjustments]
                        .map((adjustment) => adjustment.code)
                        .filter((code): code is string => !!code)

                    const shippingAddress = cart.shipping_address
                        ? toOrderAddress(cart.shipping_address)
                        : undefined
                    const billingAddress = cart.billing_address
                        ? toOrderAddress(cart.billing_address)
                        : undefined

                    const orderId = generateEntityId(undefined, 'order')
                    const status =
                        statusResult?.status_by_seller_id?.[sellerId] ??
                        statusResult?.status ??
                        OrderStatus.PENDING

                    ordersToCreate.push({
                        id: orderId,
                        region_id: cart.region?.id,
                        customer_id: cart.customer?.id,
                        sales_channel_id: cart.sales_channel_id ?? undefined,
                        status,
                        email: cart.email ?? undefined,
                        currency_code: cart.currency_code,
                        locale: cart.locale,
                        shipping_address: shippingAddress,
                        billing_address: billingAddress,
                        no_notification: false,
                        items: allItems,
                        shipping_methods: shippingMethods,
                        metadata: cart.metadata,
                        promo_codes: promoCodes,
                        // todo: add credit lines support for child orders
                        credit_lines: [],
                    })

                    sellerOrdersMap[sellerId] = orderId
                    variantIdsByOrderId[orderId] = sellerCartItems.map(
                        (item) => item.variant?.id ?? null,
                    )
                })

                return {
                    sellerOrdersMap,
                    ordersToCreate,
                    variantIdsByOrderId,
                }
            })

            const orderGroupData = transform(
                { cart },
                ({ cart }) => {
                    return {
                        customer_id: cart.customer?.id,
                        cart_id: cart.id,
                    } satisfies CreateOrderGroupDTO
                }
            )


            const sellerCustomerQueryFilters = transform(
                { cart, sellerOrdersMap },
                ({ cart, sellerOrdersMap }) => {
                    if (!cart.customer_id) {
                        return { seller_id: [], customer_id: "" }
                    }
                    return {
                        seller_id: Object.keys(sellerOrdersMap),
                        customer_id: cart.customer?.id,
                    }
                }
            )

            const existingSellerCustomerLinks = useQueryGraphStep({
                entity: "seller_customer",
                fields: ["seller_id", "customer_id"],
                filters: sellerCustomerQueryFilters,
            }).config({
                name: "existing-seller-customer-links-query",
            })

            // Create the order group ALONE first (not in parallel with
            // createOrdersStep as before) so a concurrent completion of this
            // same cart that loses the DB-level race (see createOrderGroupStep)
            // is detected here, before any order, reservation, or payment
            // work is attempted — not after.
            const orderGroupResult = createOrderGroupStep(orderGroupData)

            const wasOrderGroupCreated = transform(
                { orderGroupResult },
                ({ orderGroupResult }) => {
                    return orderGroupResult.wasCreated
                }
            )

            return {
                orderGroupResult,
                wasOrderGroupCreated,
                sales_channel_id,
                ordersToCreate,
                sellerOrdersMap,
                variantIdsByOrderId,
                existingSellerCustomerLinks,
            }
        })

        // PHASE 2 — create the per-seller orders, reserve inventory, and
        // authorize payment. Only for the execution that genuinely OWNS a
        // freshly created order group: not a plain retry against an
        // already-completed cart (`preparedOrderGroup` undefined, phase 1
        // skipped above), and not the loser of a genuine concurrency race
        // (`wasOrderGroupCreated` false) — that loser must never reserve
        // inventory or authorize payment a second time.
        //
        // This is a SIBLING top-level `when`, not nested inside phase 1's
        // `.then()`: `when().then()` tracks the steps created during its
        // callback via a single shared global variable, and a nested `when`
        // overwrites (and on completion deletes) that same global before
        // control returns to the outer one — confirmed by a startup crash
        // ("Cannot read properties of undefined (reading 'steps')") the
        // first time this was written as a nested block.
        const shouldCreateChildOrders = transform(
            { preparedOrderGroup },
            ({ preparedOrderGroup }) => {
                return preparedOrderGroup?.wasOrderGroupCreated === true
            }
        )

        when("create-child-orders", { shouldCreateChildOrders }, ({ shouldCreateChildOrders }) => {
            return shouldCreateChildOrders
        }).then(() => {
            const createdOrders = createOrdersStep(preparedOrderGroup.ordersToCreate)

            const orderLineVariantItems = transform(
                { createdOrders, variantIdsByOrderId: preparedOrderGroup.variantIdsByOrderId },
                ({ createdOrders, variantIdsByOrderId }) => {
                    const items: Array<{
                        id: string
                        quantity: number
                        variant_id: string | null
                    }> = []
                    for (const order of createdOrders) {
                        const variantIds = variantIdsByOrderId[order.id] ?? []
                        const orderItems = order.items ?? []
                        for (let i = 0; i < orderItems.length; i++) {
                            items.push({
                                id: orderItems[i].id,
                                quantity: Number(orderItems[i].quantity),
                                variant_id: variantIds[i] ?? null,
                            })
                        }
                    }
                    return items
                }
            )

            const uniqueVariantIds = transform(
                { orderLineVariantItems },
                ({ orderLineVariantItems }) => {
                    return Array.from(
                        new Set(
                            orderLineVariantItems
                                .map((item) => item.variant_id)
                                .filter((id): id is string => typeof id === "string")
                        )
                    )
                }
            )

            const { data: variantsWithInventory } = useQueryGraphStep({
                entity: "product_variant",
                fields: requiredVariantFieldsForInventoryConfirmation,
                filters: { id: uniqueVariantIds },
            }).config({ name: "fetch-variants-for-reservation" })

            const formatedInventoryItems = transform(
                {
                    salesChannelId: preparedOrderGroup.sales_channel_id,
                    items: orderLineVariantItems,
                    variants: variantsWithInventory,
                },
                ({ salesChannelId, items, variants }) =>
                    prepareVariantInventoryInput({
                        input: {
                            sales_channel_id: salesChannelId ?? undefined,
                            items,
                            variants: parseGraphRows(VariantInventoryShapeSchema, variants),
                        },
                    })
            )

            const updateCompletedAt = transform(
                { cart },
                ({ cart }) => {
                    return {
                        id: cart.id,
                        completed_at: new Date(),
                    }
                }
            )

            const promotionUsage = transform(
                { cart },
                ({ cart }) => {
                    const promotionUsage: UsageComputedActions[] = []

                    const itemAdjustments = (cart.items ?? [])
                        .map((item) => item.adjustments ?? [])
                        .flat(1)

                    const shippingAdjustments = (cart.shipping_methods ?? [])
                        .map((item) => item.adjustments ?? [])
                        .flat(1)

                    // The promotion module registers usage by code and skips
                    // actions without one.
                    for (const adjustment of [...itemAdjustments, ...shippingAdjustments]) {
                        if (!adjustment.code) {
                            continue
                        }
                        promotionUsage.push({
                            amount: adjustment.amount,
                            code: adjustment.code,
                        })
                    }

                    return {
                        computedActions: promotionUsage,
                        registrationContext: {
                            customer_id: cart.customer?.id ?? null,
                            customer_email: cart.email ?? null,
                        },
                    }
                }
            )

            const linksToCreate = transform(
                {
                    cart,
                    createdOrders,
                    orderGroupId: preparedOrderGroup.orderGroupResult.orderGroup.id,
                    sellerOrdersMap: preparedOrderGroup.sellerOrdersMap,
                    existingSellerCustomerLinks: preparedOrderGroup.existingSellerCustomerLinks,
                    ordersToCreate: preparedOrderGroup.ordersToCreate,
                },
                ({ cart, createdOrders, orderGroupId, sellerOrdersMap, existingSellerCustomerLinks, ordersToCreate }) => {
                    const links: LinkDefinition[] = createdOrders.map((order) => ({
                        [Modules.ORDER]: { order_id: order.id },
                        [Modules.CART]: { cart_id: cart.id },
                    }))

                    // A promotion may be seller-scoped (its code only ever
                    // lands on that seller's own child order) or cart-wide
                    // (target_type "order"/"shipping", no seller at all —
                    // its code lands on every child order it discounted).
                    // Deriving the link from each order's own promo_codes
                    // (already computed per seller above from that seller's
                    // item/shipping adjustments) covers both without
                    // assuming every promotion carries a `.seller`.
                    if (cart.promotions?.length) {
                        cart.promotions.forEach((promotion) => {
                            const promotionCode = promotion.code
                            if (!promotionCode) {
                                return
                            }
                            ordersToCreate.forEach((order) => {
                                if (order.promo_codes?.includes(promotionCode)) {
                                    links.push({
                                        [Modules.ORDER]: { order_id: order.id },
                                        [Modules.PROMOTION]: { promotion_id: promotion.id },
                                    })
                                }
                            })
                        })
                    }

                    // Orders are not linked to the cart's payment collection:
                    // Medusa allows a payment collection only one order. They
                    // share it through the cart until the payment is captured,
                    // when each order gets a payment collection of its own.

                    links.push(...Object.entries(sellerOrdersMap).map(([sellerId, orderId]) => ({
                        [Modules.ORDER]: { order_id: orderId },
                        [MercurModules.SELLER]: { seller_id: sellerId },
                    })))

                    links.push(...createdOrders.map((order) => ({
                        [MercurModules.SELLER]: { order_group_id: orderGroupId },
                        [Modules.ORDER]: { order_id: order.id },
                    })))

                    if (cart.customer?.id) {
                        const existingSellerIds = new Set(
                            parseGraphRows(
                                SellerCustomerLinkRowSchema,
                                existingSellerCustomerLinks?.data
                            ).map((link) => link.seller_id)
                        )

                        Object.keys(sellerOrdersMap).forEach((sellerId) => {
                            if (!existingSellerIds.has(sellerId)) {
                                links.push({
                                    [MercurModules.SELLER]: { seller_id: sellerId },
                                    [Modules.CUSTOMER]: { customer_id: cart.customer?.id },
                                })
                            }
                        })
                    }

                    return links
                }
            )


            const orderEventData = transform({ createdOrders }, ({ createdOrders }) => {
                return createdOrders.map((order) => ({ id: order.id }))
            })

            const changedInventoryItemIds = transform(
                { formatedInventoryItems },
                ({ formatedInventoryItems }) => {
                    return {
                        inventory_item_ids: Array.from(
                            new Set(
                                formatedInventoryItems.items.map(
                                    (item) => item.inventory_item_id
                                )
                            )
                        ),
                    }
                }
            )

            createRemoteLinkStep(linksToCreate)

            parallelize(
                updateCartsStep([updateCompletedAt]),
                reserveInventoryStep(formatedInventoryItems),
                registerUsageStep(promotionUsage),
                emitEventStep({
                    eventName: OrderWorkflowEvents.PLACED,
                    data: orderEventData
                }).config({
                    name: "order-placed-event",
                }),
                emitEventStep({
                    eventName: OrderGroupWorkflowEvents.CREATED,
                    data: { id: preparedOrderGroup.orderGroupResult.orderGroup.id },
                }).config({
                    name: "order-group-created-event",
                })
            )

            // Emitted only after reserveInventoryStep above has resolved (not
            // inside the same parallelize block), so the search-sync
            // subscriber never reads inventory_level before the reservation
            // it's reacting to has actually committed.
            emitEventStep({
                eventName: InventoryWorkflowEvents.LEVEL_CHANGED,
                data: changedInventoryItemIds,
            }).config({
                name: "inventory-level-changed-event",
            })

            createHook("beforePaymentAuthorization", {
                input,
            })

            const payment = authorizePaymentSessionStep({
                id: paymentSessions[0].id,
            })

            const orderIds = transform({ createdOrders }, ({ createdOrders }) => {
                return createdOrders.map((order) => order.id)
            })

            // A provider that captures on authorization leaves the payment
            // captured here; one captured later is split from the
            // `payment.captured` subscriber.
            const splitPaymentInput = transform({ payment, cart }, ({ cart }) => {
                return { cart_id: cart.id }
            })

            splitCapturedCartPaymentWorkflow.runAsStep({
                input: splitPaymentInput,
            })

            refreshOrderCommissionLinesWorkflow.runAsStep({
                input: {
                    order_ids: orderIds
                }
            })

            createHook("orderGroupCreated", {
                order_group_id: preparedOrderGroup.orderGroupResult.orderGroup.id,
                cart_id: cart.id,
            })
        })

        releaseLockStep({
            key: input.cart_id,
        })

        const result = transform(
            { preparedOrderGroup, orderGroupId },
            ({ preparedOrderGroup, orderGroupId }) => {
                return { order_group_id: preparedOrderGroup?.orderGroupResult?.orderGroup?.id ?? orderGroupId }
            }
        )

        return new WorkflowResponse(result, {
            hooks: [validate, setOrderStatus],
        })
    }
)
