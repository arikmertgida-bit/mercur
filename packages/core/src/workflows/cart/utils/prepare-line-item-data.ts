import {
    BigNumberInput,
    CreateOrderAdjustmentDTO,
    CreateOrderLineItemDTO,
    CreateOrderTaxLineDTO,
} from "@medusajs/framework/types"
import {
    generateEntityId,
    isDefined,
    isPresent,
    MathBN,
    MedusaError,
    PriceListType,
} from "@medusajs/framework/utils"
import type {
    AdjustmentRow,
    CartLineItemRow,
    CartLineItemVariantRow,
    TaxLineRow,
} from "./cart-rows"

export type PrepareVariantLineItemInput = CartLineItemVariantRow & {
    calculated_price?: {
        calculated_price?: {
            price_list_type?: string | null
        } | null
        is_calculated_price_tax_inclusive?: boolean
        original_amount: BigNumberInput
        calculated_amount: BigNumberInput
    } | null
}

export interface PrepareLineItemDataInput {
    item: CartLineItemRow
    isCustomPrice?: boolean
    variant?: PrepareVariantLineItemInput | null
    taxLines?: TaxLineRow[]
    adjustments?: AdjustmentRow[]
    cartId?: string
    unitPrice: BigNumberInput
    isTaxInclusive: boolean
}

// The order module persists these line item columns although
// `CreateOrderLineItemDTO` does not declare them.
export type PreparedLineItem = CreateOrderLineItemDTO & {
    id: string
    product_type_id?: string
    is_giftcard: boolean
    is_custom_price?: boolean
    cart_id?: string
}

export function prepareLineItemData(data: PrepareLineItemDataInput): PreparedLineItem {
    const {
        item,
        variant,
        cartId,
        taxLines,
        adjustments,
        isCustomPrice,
        unitPrice,
        isTaxInclusive,
    } = data

    if (variant && !variant.product) {
        throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Variant does not have a product"
        )
    }

    if (MathBN.lte(item.quantity, 0)) {
        throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Item quantity must be greater than 0"
        )
    }

    let compareAtUnitPrice = item.compare_at_unit_price

    const calculatedPrice = variant?.calculated_price
    const isSalePrice =
        calculatedPrice?.calculated_price?.price_list_type ===
        PriceListType.SALE

    if (
        !isPresent(compareAtUnitPrice) &&
        calculatedPrice &&
        isSalePrice &&
        !MathBN.eq(
            calculatedPrice.original_amount,
            calculatedPrice.calculated_amount
        )
    ) {
        compareAtUnitPrice = calculatedPrice.original_amount
    }

    const hasShippingProfile = isDefined(
        variant?.product?.shipping_profile?.id
    )

    const someInventoryRequiresShipping = !!variant?.inventory_items?.some(
        (inventoryItem) => !!inventoryItem.inventory?.requires_shipping
    )

    const requiresShipping = isDefined(item.requires_shipping)
        ? item.requires_shipping
        : hasShippingProfile || someInventoryRequiresShipping

    const lineItem: PreparedLineItem = {
        id: generateEntityId(undefined, 'ordli'),
        quantity: item.quantity,
        title: item.title,
        subtitle: item.subtitle ?? variant?.title ?? undefined,
        thumbnail:
            item.thumbnail ??
            variant?.thumbnail ??
            variant?.product?.thumbnail ??
            undefined,

        product_id: variant?.product?.id ?? item.product_id ?? undefined,
        product_title:
            item.product_title ?? variant?.product?.title ?? undefined,
        product_description:
            item.product_description ??
            variant?.product?.description ??
            undefined,
        product_subtitle:
            item.product_subtitle ?? variant?.product?.subtitle ?? undefined,
        product_type:
            item.product_type ?? variant?.product?.type?.value ?? undefined,
        product_type_id:
            item.product_type_id ?? variant?.product?.type?.id ?? undefined,
        product_collection:
            item.product_collection ??
            variant?.product?.collection?.title ??
            undefined,
        product_handle:
            item.product_handle ?? variant?.product?.handle ?? undefined,

        variant_id: variant?.id,
        variant_sku: item.variant_sku ?? variant?.sku ?? undefined,
        variant_barcode: item.variant_barcode ?? variant?.barcode ?? undefined,
        variant_title: item.variant_title ?? variant?.title ?? undefined,
        variant_option_values: item.variant_option_values ?? undefined,

        is_discountable: item.is_discountable,
        is_giftcard: variant?.product?.is_giftcard ?? false,
        requires_shipping: requiresShipping,

        unit_price: unitPrice,
        compare_at_unit_price: compareAtUnitPrice ?? undefined,
        is_tax_inclusive: !!isTaxInclusive,

        metadata: item.metadata ?? null,
    }

    if (isCustomPrice) {
        lineItem.is_custom_price = !!isCustomPrice
    }

    if (taxLines) {
        lineItem.tax_lines = prepareTaxLinesData(taxLines)
    }

    if (adjustments) {
        lineItem.adjustments = prepareAdjustmentsData(adjustments)
    }

    if (cartId) {
        lineItem.cart_id = cartId
    }

    return lineItem
}

export function prepareTaxLinesData(data: TaxLineRow[]): CreateOrderTaxLineDTO[] {
    return data.map((d) => ({
        description: d.description ?? undefined,
        tax_rate_id: d.tax_rate_id ?? undefined,
        code: d.code,
        rate: d.rate,
        provider_id: d.provider_id ?? undefined,
    }))
}

export function prepareAdjustmentsData(data: AdjustmentRow[]): CreateOrderAdjustmentDTO[] {
    return data.map((d) => ({
        code: d.code ?? undefined,
        amount: d.amount,
        description: d.description ?? undefined,
        promotion_id: d.promotion_id ?? undefined,
        provider_id: d.provider_id ?? undefined,
        is_tax_inclusive: d.is_tax_inclusive ?? undefined,
    }))
}
