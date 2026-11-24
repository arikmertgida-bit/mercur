import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "zod"

import {
  PRODUCT_MOVE_NAMES_SEPARATOR,
  PRODUCT_MOVE_RESERVED_STOCK_CODE,
  PRODUCT_MOVE_SELLER_PRICE_LISTS_CODE,
  PRODUCT_MOVE_SELLER_PROMOTIONS_CODE,
  PRODUCT_SELLER_UNCHANGED_CODE,
} from "../../../api/utils/admin-error-codes"
import { parseGraphRows } from "../../../utils/graph-rows"
import {
  assertSellerExists,
  assertShippingProfileOfSeller,
} from "../utils/seller-ownership"

const PRODUCT_RULE_ATTRIBUTE = "items.product.id"

const ProductRowSchema = z.object({
  id: z.string(),
  sellers: z.array(z.object({ id: z.string() }).nullable()).nullish(),
  variants: z
    .array(
      z
        .object({
          price_set: z.object({ id: z.string() }).nullish(),
          inventory_items: z
            .array(z.object({ inventory_item_id: z.string() }).nullable())
            .nullish(),
        })
        .nullable()
    )
    .nullish(),
})

const RuleRowSchema = z.object({
  attribute: z.string(),
  values: z.array(z.object({ value: z.string() }).nullable()).nullish(),
})

const PromotionRowSchema = z.object({
  id: z.string(),
  code: z.string().nullish(),
  rules: z.array(RuleRowSchema.nullable()).nullish(),
  application_method: z
    .object({
      target_rules: z.array(RuleRowSchema.nullable()).nullish(),
      buy_rules: z.array(RuleRowSchema.nullable()).nullish(),
    })
    .nullish(),
})

const PromotionLinkRowSchema = z.object({ promotion_id: z.string() })
const PriceListLinkRowSchema = z.object({ price_list_id: z.string() })

export type ValidateProductSellerChangeStepInput = {
  product_id: string
  seller_id: string
  shipping_profile_id: string
}

export type ValidateProductSellerChangeStepOutput = {
  previous_seller_ids: string[]
  inventory_item_ids: string[]
}

const namesProduct = (
  rules: readonly (z.infer<typeof RuleRowSchema> | null)[] | null | undefined,
  productId: string
): boolean =>
  (rules ?? []).some(
    (rule) =>
      rule?.attribute === PRODUCT_RULE_ATTRIBUTE &&
      (rule.values ?? []).some((value) => value?.value === productId)
  )

export const validateProductSellerChangeStepId =
  "validate-product-seller-change"

/**
 * Checks everything a move to another seller needs before anything is
 * written: the target seller and its own shipping profile, no reserved stock
 * (an unshipped order still counts on the old seller's warehouse), and no
 * promotion or price list of the old seller still naming the product (they
 * would keep discounting / pricing what another store now sells).
 */
export const validateProductSellerChangeStep = createStep(
  validateProductSellerChangeStepId,
  async (
    input: ValidateProductSellerChangeStepInput,
    { container }
  ): Promise<StepResponse<ValidateProductSellerChangeStepOutput>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: productRows } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "sellers.id",
        "variants.price_set.id",
        "variants.inventory_items.inventory_item_id",
      ],
      filters: { id: input.product_id },
    })
    const [product] = parseGraphRows(ProductRowSchema, productRows)
    if (!product) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product with id: ${input.product_id} was not found`
      )
    }

    await assertSellerExists(container, input.seller_id)

    const previousSellerIds = (product.sellers ?? []).flatMap((seller) =>
      seller ? [seller.id] : []
    )
    if (
      previousSellerIds.length === 1 &&
      previousSellerIds[0] === input.seller_id
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The product already belongs to this store",
        PRODUCT_SELLER_UNCHANGED_CODE
      )
    }

    await assertShippingProfileOfSeller(
      container,
      input.seller_id,
      input.shipping_profile_id
    )

    const variants = (product.variants ?? []).flatMap((variant) =>
      variant ? [variant] : []
    )
    const inventoryItemIds = Array.from(
      new Set(
        variants.flatMap((variant) =>
          (variant.inventory_items ?? []).flatMap((item) =>
            item ? [item.inventory_item_id] : []
          )
        )
      )
    )
    const priceSetIds = variants.flatMap((variant) =>
      variant.price_set ? [variant.price_set.id] : []
    )

    if (inventoryItemIds.length) {
      const inventoryModule = container.resolve(Modules.INVENTORY)
      const [, reservationCount] =
        await inventoryModule.listAndCountReservationItems(
          { inventory_item_id: inventoryItemIds },
          { take: 1 }
        )
      if (reservationCount > 0) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "The product cannot be moved while it has reserved stock for unshipped orders",
          PRODUCT_MOVE_RESERVED_STOCK_CODE
        )
      }
    }

    const otherPreviousSellerIds = previousSellerIds.filter(
      (sellerId) => sellerId !== input.seller_id
    )

    if (otherPreviousSellerIds.length) {
      const { data: promotionLinks } = await query.graph({
        entity: "promotion_seller",
        fields: ["promotion_id"],
        filters: { seller_id: otherPreviousSellerIds },
      })
      const promotionIds = parseGraphRows(
        PromotionLinkRowSchema,
        promotionLinks
      ).map((link) => link.promotion_id)

      if (promotionIds.length) {
        const { data: promotionRows } = await query.graph({
          entity: "promotion",
          fields: [
            "id",
            "code",
            "rules.attribute",
            "rules.values.value",
            "application_method.target_rules.attribute",
            "application_method.target_rules.values.value",
            "application_method.buy_rules.attribute",
            "application_method.buy_rules.values.value",
          ],
          filters: { id: promotionIds },
        })
        const blocking = parseGraphRows(PromotionRowSchema, promotionRows)
          .filter(
            (promotion) =>
              namesProduct(promotion.rules, input.product_id) ||
              namesProduct(
                promotion.application_method?.target_rules,
                input.product_id
              ) ||
              namesProduct(
                promotion.application_method?.buy_rules,
                input.product_id
              )
          )
          .map((promotion) => promotion.code ?? promotion.id)

        if (blocking.length) {
          throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            `Remove the product from the current store's promotions first${PRODUCT_MOVE_NAMES_SEPARATOR}${blocking.join(", ")}`,
            PRODUCT_MOVE_SELLER_PROMOTIONS_CODE
          )
        }
      }

      const { data: priceListLinks } = await query.graph({
        entity: "price_list_seller",
        fields: ["price_list_id"],
        filters: { seller_id: otherPreviousSellerIds },
      })
      const priceListIds = parseGraphRows(
        PriceListLinkRowSchema,
        priceListLinks
      ).map((link) => link.price_list_id)

      if (priceListIds.length && priceSetIds.length) {
        const pricingModule = container.resolve(Modules.PRICING)
        const prices = await pricingModule.listPrices(
          { price_list_id: priceListIds, price_set_id: priceSetIds },
          { select: ["id"], relations: ["price_list"] }
        )
        const titleByPriceListId = new Map<string, string>()
        for (const price of prices) {
          if (price.price_list) {
            titleByPriceListId.set(
              price.price_list.id,
              price.price_list.title ?? price.price_list.id
            )
          }
        }

        if (titleByPriceListId.size) {
          throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            `Remove the product from the current store's price lists first${PRODUCT_MOVE_NAMES_SEPARATOR}${Array.from(
              titleByPriceListId.values()
            ).join(", ")}`,
            PRODUCT_MOVE_SELLER_PRICE_LISTS_CODE
          )
        }
      }
    }

    return new StepResponse({
      previous_seller_ids: previousSellerIds,
      inventory_item_ids: inventoryItemIds,
    })
  }
)
