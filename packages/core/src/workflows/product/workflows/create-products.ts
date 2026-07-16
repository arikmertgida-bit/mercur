import {
  createHook,
  createWorkflow,
  type ReturnWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  AdditionalData,
  CreateProductWorkflowInputDTO,
  ProductTypes,
} from "@medusajs/framework/types"
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow as stockCreateProductsWorkflow,
  createProductVariantsWorkflow,
  emitEventStep,
  removeProductOptionsFromProductStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import {
  AttributeType,
  CreateProductDTO,
  ProductAttributeBatchAdd,
  ProductChangeActionType,
} from "@mercurjs/types"

import { addProductAttributesToProductWorkflow } from "../../product-attribute/workflows/add-product-attributes-to-product"
import { recordProductAuditChangeWorkflow } from "../../product-edit/workflows/record-product-audit-change"
import { associateSellersWithInventoryItemStep } from "../../inventory-item/steps"
import {
  associateSellersWithProductStep,
} from "../steps"
import { ProductWorkflowEvents } from "../events"



type CreateProductVariantInput =
  NonNullable<CreateProductDTO["variants"]>[number] & {
    variant_rank?: number
    prices?: { amount: number; currency_code: string }[]
    inventory?: { location_id: string; quantity: number }[]
  }

export type CreateProductsWorkflowInput = {
  products: (Omit<CreateProductDTO, "variants"> & {
    seller_ids?: string[]
    shipping_profile_id?: string | null
    variants?: CreateProductVariantInput[]
  })[]
  created_by: string
} & AdditionalData

export const createProductsWorkflowId = "mercur-create-products"

export const createProductsWorkflow: ReturnWorkflow<
  CreateProductsWorkflowInput,
  ProductTypes.ProductDTO[],
  unknown[]
> = createWorkflow(
  createProductsWorkflowId,
  function (input: CreateProductsWorkflowInput) {
    const validate = createHook("validate", {
      input,
      products: input.products,
    })

    const referencedAttrIds = transform({ input }, ({ input }) =>
      Array.from(
        new Set(
          input.products.flatMap((p) =>
            (p.attributes ?? [])
              .filter(
                (r): r is Extract<ProductAttributeBatchAdd, { id: string }> =>
                  "id" in r && !!r.id,
              )
              .map((r) => r.id),
          ),
        ),
      ),
    )

    const referencedAttrs = useQueryGraphStep({
      entity: "product_attribute",
      fields: ["id", "type", "is_variant_axis"],
      filters: { id: referencedAttrIds },
    }).config({ name: "mercur-create-products-axis-attrs" })

    // A product with no sales-channel link is invisible to every publishable
    // API key scoped to a channel, which silently breaks pricing/checkout for
    // storefront visitors. Every product is born into the store's configured
    // default channel unless the platform has none set up yet.
    const storeQuery = useQueryGraphStep({
      entity: "store",
      fields: ["id", "default_sales_channel_id"],
      options: { isList: false },
    }).config({ name: "mercur-create-products-store" })

    // Stock create hard-requires ≥1 option, but a product's real axis option is
    // only attached after the row exists. So every product is born with this
    // internal placeholder, which `defaultOptionRemovals` strips once a real
    // option is present (axis products) and which is kept for genuinely
    // axis-less products.
    const stockProducts = transform(
      { input, storeQuery },
      ({ input, storeQuery }): CreateProductWorkflowInputDTO[] => {
        const defaultSalesChannelId = storeQuery.data?.default_sales_channel_id
        return input.products.map((p) => {
          const {
            attributes: _attributes,
            variants: _variants,
            seller_ids: _seller_ids,
            ...rest
          } = p
          return {
            ...rest,
            shipping_profile_id: rest.shipping_profile_id ?? undefined,
            sales_channels: defaultSalesChannelId
              ? [{ id: defaultSalesChannelId }]
              : undefined,
            options: [{ title: "__default__", values: ["__default__"] }],
          }
        })
      },
    )

    const hasAxisByIndex = transform(
      { input, referencedAttrs },
      ({ input, referencedAttrs }) => {
        const axisIds = new Set<string>(
          ((referencedAttrs.data ?? []) as {
            id: string
            type: AttributeType
            is_variant_axis: boolean
          }[])
            .filter(
              (a) =>
                a.type === AttributeType.MULTI_SELECT && !!a.is_variant_axis,
            )
            .map((a) => a.id),
        )

        return input.products.map((p) =>
          (p.attributes ?? []).some((r) =>
            "id" in r
              ? axisIds.has(r.id)
              : (r as { is_variant_axis?: boolean }).is_variant_axis === true,
          ),
        )
      },
    )

    const createdProducts = stockCreateProductsWorkflow.runAsStep({
      input: {
        products: stockProducts,
        additional_data: input.additional_data,
      },
    })

    const attributeItems = transform(
      { input, createdProducts },
      ({ input, createdProducts }) =>
        input.products
          .map((p, idx) => ({
            product_id: createdProducts[idx]?.id as string,
            add: p.attributes ?? [],
          }))
          .filter((item) => item.product_id && item.add.length > 0),
    )

    when(
      { attributeItems },
      ({ attributeItems }) => attributeItems.length > 0,
    ).then(() =>
      addProductAttributesToProductWorkflow.runAsStep({
        input: attributeItems,
      }),
    )

    const defaultOptionRemovals = transform(
      { hasAxisByIndex, createdProducts },
      ({ hasAxisByIndex, createdProducts }) => {
        const pairs: { product_id: string; product_option_id: string }[] = []
        ;(
          createdProducts as {
            id: string
            options?: { id: string; title: string }[]
          }[]
        ).forEach((p, i) => {
          if (!hasAxisByIndex[i]) {
            return
          }
          const def = (p.options ?? []).find(
            (o) => o.title === "__default__",
          )
          if (def) {
            pairs.push({ product_id: p.id, product_option_id: def.id })
          }
        })
        return pairs
      },
    )

    when(
      { defaultOptionRemovals },
      ({ defaultOptionRemovals }) => defaultOptionRemovals.length > 0,
    ).then(() => removeProductOptionsFromProductStep(defaultOptionRemovals))

    const productVariants = transform(
      { input, createdProducts, hasAxisByIndex },
      ({ input, createdProducts, hasAxisByIndex }) =>
        input.products.flatMap((p, idx) => {
          const product_id = createdProducts[idx]?.id as string
          const formOptions = (v: { options?: Record<string, string> }) =>
            v.options ?? {}
          return (p.variants ?? []).map((v, variantIdx) => ({
            manage_inventory: (v.inventory?.length ?? 0) > 0,
            ...v,
            product_id,
            // Falls back to array order when the caller doesn't set
            // `variant_rank` (it stays untouched when they do, e.g. the
            // vendor UI's own counter) so the inventory-item lookup below —
            // keyed by `product_id:variant_rank` — actually matches the rank
            // Medusa assigns each variant on creation. Without this
            // fallback, callers that omit `variant_rank` always produced a
            // `product_id:undefined` lookup key and every `inventory` entry
            // was silently dropped, leaving `manage_inventory: true`
            // variants with zero stock levels.
            variant_rank: v.variant_rank ?? variantIdx,
            options: hasAxisByIndex[idx]
              ? formOptions(v)
              : { __default__: "__default__", ...formOptions(v) },
          }))
        }),
    )

    // `inventory` isn't a real product-variant DTO field — it's consumed
    // below, after creation, to stock the auto-linked inventory item. Strip
    // it here so it's never sent to the stock variant-create workflow.
    const variantsForCreation = transform(
      { productVariants },
      ({ productVariants }) =>
        productVariants.map(({ inventory: _inventory, ...rest }) => rest),
    )

    // Inventory levels can't be set as part of variant creation (they live on
    // a separate module) so we create the variants first, then look up the
    // inventory items Medusa auto-links to `manage_inventory: true` variants
    // and stock them at the seller's chosen locations. Variants are matched
    // back to their form row by `product_id` + `variant_rank`, both stamped
    // on every row, rather than relying on result-array ordering.
    when(
      { variantsForCreation },
      ({ variantsForCreation }) => variantsForCreation.length > 0,
    ).then(() =>
      createProductVariantsWorkflow.runAsStep({
        input: {
          product_variants:
            variantsForCreation as ProductTypes.CreateProductVariantDTO[],
          additional_data: input.additional_data,
        },
      }),
    )

    const createdProductIds = transform(
      { createdProducts },
      ({ createdProducts }) => createdProducts.map((p) => p.id as string),
    )

    const variantInventoryItems = useQueryGraphStep({
      entity: "product_variant",
      fields: [
        "id",
        "product_id",
        "variant_rank",
        "inventory_items.inventory_item_id",
      ],
      filters: { product_id: createdProductIds },
    }).config({ name: "mercur-create-products-variant-inventory-items" })

    const inventoryLevelsInput = transform(
      { productVariants, variantInventoryItems },
      ({ productVariants, variantInventoryItems }) => {
        const inventoryItemIdByKey = new Map<string, string>()
        for (const row of variantInventoryItems.data as {
          product_id: string | null
          variant_rank: number | null
          inventory_items?: { inventory_item_id: string }[]
        }[]) {
          const inventoryItemId = row.inventory_items?.[0]?.inventory_item_id
          if (inventoryItemId && row.product_id !== null && row.variant_rank !== null) {
            inventoryItemIdByKey.set(`${row.product_id}:${row.variant_rank}`, inventoryItemId)
          }
        }

        const levels: {
          inventory_item_id: string
          location_id: string
          stocked_quantity: number
        }[] = []

        for (const variant of productVariants) {
          const inventoryItemId = inventoryItemIdByKey.get(
            `${variant.product_id}:${variant.variant_rank}`,
          )
          if (!inventoryItemId) continue

          for (const entry of variant.inventory ?? []) {
            levels.push({
              inventory_item_id: inventoryItemId,
              location_id: entry.location_id,
              stocked_quantity: entry.quantity,
            })
          }
        }

        return levels
      },
    )

    when(
      { inventoryLevelsInput },
      ({ inventoryLevelsInput }) => inventoryLevelsInput.length > 0,
    ).then(() =>
      createInventoryLevelsWorkflow.runAsStep({
        input: { inventory_levels: inventoryLevelsInput },
      }),
    )

    // Every inventory item Medusa auto-creates for a `manage_inventory: true`
    // variant must be linked back to the product's own seller(s) — otherwise
    // the vendor panel's Inventory view (scoped by `inventory_item_seller`,
    // see `applySellerInventoryItemLinkFilter`) never lists it.
    const sellerInventoryItemLinks = transform(
      { input, createdProducts, variantInventoryItems },
      ({ input, createdProducts, variantInventoryItems }) => {
        const inventoryItemIdsByProductId = new Map<string, string[]>()
        for (const row of variantInventoryItems.data as {
          product_id: string | null
          inventory_items?: { inventory_item_id: string }[]
        }[]) {
          const inventoryItemId = row.inventory_items?.[0]?.inventory_item_id
          if (!inventoryItemId || !row.product_id) continue

          const existing = inventoryItemIdsByProductId.get(row.product_id) ?? []
          existing.push(inventoryItemId)
          inventoryItemIdsByProductId.set(row.product_id, existing)
        }

        const links: { inventory_item_id: string; seller_id: string }[] = []
        input.products.forEach((p, idx) => {
          const product_id = createdProducts[idx]?.id
          if (!product_id) return

          const inventoryItemIds =
            inventoryItemIdsByProductId.get(product_id) ?? []
          for (const seller_id of p.seller_ids ?? []) {
            for (const inventory_item_id of inventoryItemIds) {
              links.push({ inventory_item_id, seller_id })
            }
          }
        })
        return links
      },
    )

    when(
      { sellerInventoryItemLinks },
      ({ sellerInventoryItemLinks }) => sellerInventoryItemLinks.length > 0,
    ).then(() =>
      associateSellersWithInventoryItemStep({ links: sellerInventoryItemLinks }).config({
        name: "mercur-create-products-associate-sellers-inventory-items",
      }),
    )

    const sellerProductLinks = transform(
      { input, createdProducts },
      ({ input, createdProducts }) => {
        const links: { product_id: string; seller_id: string }[] = []
        input.products.forEach((p, idx) => {
          const product_id = createdProducts[idx]?.id
          for (const seller_id of p.seller_ids ?? []) {
            links.push({ product_id, seller_id })
          }
        })
        return links
      },
    )

    associateSellersWithProductStep({ links: sellerProductLinks }).config({
      name: "mercur-create-products-associate-sellers",
    })

    recordProductAuditChangeWorkflow.runAsStep({
      input: transform(
        { createdProducts, input },
        ({ createdProducts, input }) => ({
          actor_id: input.created_by,
          changes: createdProducts.map((product) => ({
            product_id: product.id as string,
            actions: [
              {
                product_id: product.id as string,
                action: ProductChangeActionType.PRODUCT_ADD,
                details: { status: product.status as string },
              },
            ],
          })),
        }),
      ),
    })

    const productsCreated = createHook("productsCreated", {
      products: createdProducts,
      additional_data: input.additional_data,
    })

    emitEventStep({
      eventName: ProductWorkflowEvents.CREATED,
      data: transform({ createdProducts }, ({ createdProducts }) =>
        createdProducts.map((p) => ({ id: p.id })),
      ),
    })

    return new WorkflowResponse(createdProducts, {
      hooks: [validate, productsCreated] as const,
    })
  },
)
