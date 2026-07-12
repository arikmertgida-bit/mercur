import {
    createHook,
    createWorkflow,
    transform,
    WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { AdditionalData, ShippingOptionDTO } from "@medusajs/framework/types"
import {
    getTranslatedShippingOptionsStep,
    useQueryGraphStep,
    useRemoteQueryStep,
    validatePresenceOfStep,
} from "@medusajs/medusa/core-flows"
import { deduplicate, filterObjectByKeys, isDefined, MathBN } from "@medusajs/framework/utils"
import { BigNumberInput } from "@medusajs/framework/types"
import { cartFieldsForPricingContext, CartLineItemWithSeller, getLineItemSellerId, pricingContextResult, shippingOptionsContextResult } from "../utils"
import { SellerDTO } from "@mercurjs/types"

type CartItemVariantInventoryLevel = {
    location_id: string
    stocked_quantity?: BigNumberInput
    reserved_quantity?: BigNumberInput
    raw_stocked_quantity?: BigNumberInput
    raw_reserved_quantity?: BigNumberInput
}

type CartItemWithInventory = Omit<CartLineItemWithSeller, "variant"> & {
    variant?: (Omit<NonNullable<CartLineItemWithSeller["variant"]>, "inventory_items"> & {
        inventory_items?: Array<{
            inventory?: {
                requires_shipping?: boolean
                location_levels?: CartItemVariantInventoryLevel[]
            } | null
        }> | null
    }) | null
}

export type ListSellerShippingOptionsForCartWorkflowInput = {
    cart_id: string
    is_return?: boolean
    enabled_in_store?: boolean
    fields?: string[]
} & AdditionalData


export const listSellerShippingOptionsForCartWorkflow = createWorkflow(
    "list-seller-shipping-options-for-cart",
    (input: ListSellerShippingOptionsForCartWorkflowInput) => {
        const cartQuery = useQueryGraphStep({
            entity: "cart",
            filters: { id: input.cart_id },
            fields: [
                ...cartFieldsForPricingContext,
                "items.*",
                "items.variant.id",
                "items.variant.product.sellers.id",
                "items.variant.inventory_items.inventory.requires_shipping",
                "items.variant.inventory_items.inventory.location_levels.location_id",
                "items.variant.inventory_items.inventory.location_levels.stocked_quantity",
                "items.variant.inventory_items.inventory.location_levels.reserved_quantity",
                "items.variant.inventory_items.inventory.location_levels.raw_stocked_quantity",
                "items.variant.inventory_items.inventory.location_levels.raw_reserved_quantity",
            ],
            options: { throwIfKeyNotFound: true },
        }).config({ name: "get-cart" })

        const cart = transform({ cartQuery }, ({ cartQuery }) => cartQuery.data[0])
        const cartSellers = transform({ cart }, ({ cart }) =>
            (cart.items as CartLineItemWithSeller[])
                .map((item) => getLineItemSellerId(item))
                .filter((id): id is string => typeof id === "string")
        )

        validatePresenceOfStep({
            entity: cart,
            fields: ["sales_channel_id", "region_id", "currency_code"],
        })

        const sellerStockLocationsQuery = useQueryGraphStep({
            entity: "stock_location_seller",
            filters: { seller_id: cartSellers },
            fields: [
                "stock_location.id",
                "stock_location.name",
                "stock_location.address.*",
                "stock_location.fulfillment_sets.id",
            ],
            options: {
                cache: {
                    enable: true,
                },
            },
        }).config({ name: "seller-stock-locations-query" })

        const stockLocationIds = transform(
            { sellerStockLocationsQuery },
            ({ sellerStockLocationsQuery }) => {
                return sellerStockLocationsQuery.data.map((sl) => sl.stock_location.id)
            }
        )

        const salesChannelStockLocationsQuery = useQueryGraphStep({
            entity: "sales_channel_location",
            filters: {
                sales_channel_id: cart.sales_channel_id,
                stock_location_id: stockLocationIds,
            },
            fields: [
                "stock_location_id",
            ],
            options: {
                cache: {
                    enable: true,
                },
            },
        }).config({ name: "sales-channel-stock-locations-query" })

        const validStockLocations = transform(
            { salesChannelStockLocationsQuery, sellerStockLocationsQuery },
            ({ salesChannelStockLocationsQuery, sellerStockLocationsQuery }) => {
                const validIds = new Set<string>(salesChannelStockLocationsQuery.data.map((sl) => sl.stock_location_id))

                return sellerStockLocationsQuery.data.filter((sl) => validIds.has(sl.stock_location.id))
            }
        )

        const { fulfillmentSetIds } = transform(
            { validStockLocations },
            ({ validStockLocations }) => {
                const fulfillmentSetIds = new Set<string>()

                validStockLocations.forEach((stockLocation) => {
                    stockLocation.stock_location.fulfillment_sets?.forEach((fulfillmentSet) => {
                        fulfillmentSetIds.add(fulfillmentSet.id)
                    })
                })

                return {
                    fulfillmentSetIds: Array.from(fulfillmentSetIds),
                }
            }
        )

        const setPricingContext = createHook(
            "setPricingContext",
            {
                cart: cart,
                fulfillmentSetIds,
                additional_data: input.additional_data,
            },
            {
                resultValidator: pricingContextResult,
            }
        )
        const setPricingContextResult = setPricingContext.getResult()

        const setShippingOptionsContext = createHook(
            "setShippingOptionsContext",
            {
                cart: cart,
                fulfillmentSetIds,
                additional_data: input.additional_data,
            },
            {
                resultValidator: shippingOptionsContextResult,
            }
        )
        const setShippingOptionsContextResult = setShippingOptionsContext.getResult()

        const queryVariables = transform(
            {
                input,
                fulfillmentSetIds,
                cart,
                setPricingContextResult,
                setShippingOptionsContextResult,
            },
            ({
                input,
                fulfillmentSetIds,
                cart,
                setPricingContextResult,
                setShippingOptionsContextResult,
            }) => {
                return {
                    context: {
                        ...(setShippingOptionsContextResult
                            ? setShippingOptionsContextResult
                            : {}),
                        is_return: input.is_return ? "true" : "false",
                        enabled_in_store: !isDefined(input.enabled_in_store)
                            ? "true"
                            : input.enabled_in_store
                                ? "true"
                                : "false",
                    },

                    filters: {
                        fulfillment_set_id: fulfillmentSetIds,
                        address: {
                            country_code: cart.shipping_address?.country_code,
                            province_code: cart.shipping_address?.province,
                            city: cart.shipping_address?.city,
                            postal_expression: cart.shipping_address?.postal_code,
                        },
                    },

                    calculated_price: {
                        context: {
                            ...filterObjectByKeys(cart, cartFieldsForPricingContext),
                            ...(setPricingContextResult ? setPricingContextResult : {}),
                            currency_code: cart.currency_code,
                            region_id: cart.region_id,
                            region: cart.region,
                            customer_id: cart.customer_id,
                            customer: cart.customer,
                        },
                    },
                }
            }
        )

        const fields = transform(input, ({ fields = [] }) => {
            return deduplicate([
                ...fields,
                "id",
                "name",
                "price_type",
                "service_zone_id",
                "shipping_profile_id",
                "provider_id",
                "data",
                "service_zone.fulfillment_set_id",
                "service_zone.fulfillment_set.type",
                "service_zone.fulfillment_set.location.id",
                "service_zone.fulfillment_set.location.address.*",

                "type.id",
                "type.label",
                "type.description",
                "type.code",

                "provider.id",
                "provider.is_enabled",

                "rules.attribute",
                "rules.value",
                "rules.operator",

                "calculated_price.*",
                "prices.*",
                "prices.price_rules.*",
                'seller.id',
            ])
        })

        const shippingOptions = useRemoteQueryStep({
            entry_point: "shipping_options",
            fields,
            variables: queryVariables,
        }).config({ name: "shipping-options-query" })

        const shippingOptionsWithPrice = transform(
            { shippingOptions, cart },
            ({ shippingOptions, cart }) =>
                shippingOptions.map((shippingOption) => {
                    const price = shippingOption.calculated_price

                    const locationId =
                        shippingOption.service_zone.fulfillment_set.location.id

                    const itemsAtLocationWithoutAvailableQuantity = (
                        cart.items as CartItemWithInventory[]
                    ).filter((item) => {
                            const links = item.variant?.inventory_items ?? []
                            if (!links.length) {
                                return false
                            }

                            return links.some((inventoryItem) => {
                                if (!inventoryItem.inventory?.requires_shipping) {
                                    return false
                                }

                                const level = (
                                    inventoryItem.inventory?.location_levels ?? []
                                ).find(
                                    (locationLevel) =>
                                        locationLevel.location_id === locationId
                                )

                                if (!level) {
                                    return true
                                }

                                const available = MathBN.sub(
                                    level.raw_stocked_quantity ?? level.stocked_quantity ?? 0,
                                    level.raw_reserved_quantity ?? level.reserved_quantity ?? 0
                                )

                                return MathBN.lt(available, item.quantity)
                            })
                        })

                    return {
                        ...shippingOption,
                        amount: price?.calculated_amount,
                        is_tax_inclusive: !!price?.is_calculated_price_tax_inclusive,
                        insufficient_inventory:
                            itemsAtLocationWithoutAvailableQuantity.length > 0,
                    }
                })
        )

        const translatedShippingOptions = getTranslatedShippingOptionsStep({
            shippingOptions: shippingOptionsWithPrice,
            locale: cart.locale,
        })

        const sellerShippingOptionsMap = transform(
            { translatedShippingOptions },
            ({ translatedShippingOptions }) => {
                const result: Record<string, ShippingOptionDTO[]> = {}

                translatedShippingOptions.forEach((option_) => {
                    const option = option_ as ShippingOptionDTO & { seller: SellerDTO }
                    const sellerId = option.seller?.id
                    if (!sellerId) return

                    if (!result[sellerId]) {
                        result[sellerId] = []
                    }

                    result[sellerId].push(option)
                })

                return result
            }
        )

        return new WorkflowResponse(sellerShippingOptionsMap, {
            hooks: [setPricingContext, setShippingOptionsContext] as const,
        })
    }
)
