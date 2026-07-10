import type {
  Context,
  FindConfig,
  ModuleJoinerConfig,
} from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
  toHandle,
} from "@medusajs/framework/utils"
import {
  AttributeType,
  CreateProductAttributeDTO,
  ProductAttributeDTO,
  ProductAttributeValueDTO,
  UpdateProductAttributeDTO,
  UpsertProductAttributeValueDTO,
} from "@mercurjs/types"

import { joinerConfig } from "./joiner-config"
import { ProductAttribute, ProductAttributeValue } from "./models"

type UpdateProductAttributeInput = UpdateProductAttributeDTO & { id: string }
type UpsertProductAttributeValueInput = UpsertProductAttributeValueDTO & {
  attribute_id: string
}

/**
 * TypeScript cannot apply a decorator (`@InjectManager`/`@InjectTransactionManager`,
 * required here for Medusa's DB session handling) to a method with public
 * overload signatures — only to a single implementation signature. Every
 * real caller in this codebase always passes (and expects back) an array, so
 * these overrides are array-only rather than fighting the base class's
 * generated single-or-array generic shape. `MedusaService(...)`'s own
 * generated parameter/return types are anonymous structural types inferred
 * from the DML model schema and don't line up 1:1 with our hand-authored
 * `@mercurjs/types` DTOs (confirmed via `tsc` — e.g. an optional field's
 * exact null/undefined shape differs) — those specific mismatches are the
 * only `@ts-expect-error` uses below, each at a real third-party
 * (Medusa/TypeScript) type-system boundary, not a shortcut.
 */
class ProductAttributeModuleService extends MedusaService({
  ProductAttribute,
  ProductAttributeValue,
}) {
  __joinerConfig(): ModuleJoinerConfig {
    return joinerConfig
  }

  @InjectTransactionManager()
  // @ts-expect-error — see class-level comment on the base/override signature gap.
  async createProductAttributes(
    data: Omit<CreateProductAttributeDTO, "values">[],
    sharedContext?: Context,
  ): Promise<ProductAttributeDTO[]> {
    const input = data.map((attribute) => {
      if (!attribute.handle && !attribute.product_id && attribute.name) {
        return { ...attribute, handle: toHandle(attribute.name) }
      }
      return attribute
    })

    const created: ProductAttributeDTO[] = await super.createProductAttributes(
      input,
      sharedContext,
    )

    const toggleValues = created
      .filter((attribute) => attribute.type === AttributeType.TOGGLE)
      .flatMap((attribute) => [
        { attribute_id: attribute.id, name: "true", rank: 0 },
        { attribute_id: attribute.id, name: "false", rank: 1 },
      ])

    if (toggleValues.length) {
      await this.createProductAttributeValues(toggleValues, sharedContext)
    }

    return created
  }

  @InjectTransactionManager()
  // @ts-expect-error — see class-level comment on the base/override signature gap.
  async updateProductAttributes(
    data: UpdateProductAttributeInput[],
    sharedContext?: Context,
  ): Promise<ProductAttributeDTO[]> {
    const idsWithType = data
      .filter((u) => u.id && u.type !== undefined)
      .map((u) => u.id)

    if (idsWithType.length) {
      const existing = await this.listProductAttributes(
        { id: idsWithType },
        { select: ["id", "type"] },
        sharedContext,
      )
      const typeById = new Map<string, string>(
        existing.map((a) => [a.id, a.type]),
      )

      for (const update of data) {
        if (!update.id || update.type === undefined) {
          continue
        }
        const currentType = typeById.get(update.id)
        if (currentType !== undefined && update.type !== currentType) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Cannot change the type of an existing attribute (${update.id}): "${currentType}" -> "${update.type}".`,
          )
        }
      }
    }

    return super.updateProductAttributes(data, sharedContext)
  }

  private static readonly VALUE_TYPES = new Set<string>([
    AttributeType.SINGLE_SELECT,
    AttributeType.MULTI_SELECT,
    AttributeType.TOGGLE,
  ])

  private wantsValues(config?: FindConfig<ProductAttributeDTO>): boolean {
    const relations = config?.relations ?? []
    if (relations.some((r) => r === "values" || r.startsWith("values."))) {
      return true
    }
    const select = (config?.select as string[] | undefined) ?? []
    return select.some((s) => s === "values" || s.startsWith("values."))
  }

  private stripValuesFromConfig(
    config?: FindConfig<ProductAttributeDTO>,
  ): FindConfig<ProductAttributeDTO> | undefined {
    if (!config) {
      return config
    }

    const next: FindConfig<ProductAttributeDTO> = { ...config }

    if (Array.isArray(next.relations)) {
      next.relations = next.relations.filter(
        (r) => r !== "values" && !r.startsWith("values."),
      )
    }

    if (Array.isArray(next.select)) {
      next.select = Array.from(
        new Set([
          ...(next.select as string[]).filter(
            (s) => s !== "values" && !s.startsWith("values."),
          ),
          "id",
          "type",
        ]),
      ) as (keyof ProductAttributeDTO)[]
    }

    return next
  }

  private deriveValueConfig(
    config?: FindConfig<ProductAttributeDTO>,
  ): FindConfig<ProductAttributeValueDTO> {
    const relations = (config?.relations ?? [])
      .filter((r) => r.startsWith("values."))
      .map((r) => r.slice("values.".length))
    const selectPaths = ((config?.select as string[] | undefined) ?? [])
      .filter((s) => s.startsWith("values."))
      .map((s) => s.slice("values.".length))

    const valueConfig: FindConfig<ProductAttributeValueDTO> = {}
    if (relations.length) {
      valueConfig.relations = relations
    }
    if (selectPaths.length) {
      valueConfig.select = Array.from(
        new Set([...selectPaths, "attribute_id"]),
      ) as (keyof ProductAttributeValueDTO)[]
    }

    return valueConfig
  }

  private async attachValues(
    attributes: ProductAttributeDTO[],
    config?: FindConfig<ProductAttributeDTO>,
    sharedContext?: Context,
  ): Promise<void> {
    const valueAttributes = attributes.filter((a) =>
      ProductAttributeModuleService.VALUE_TYPES.has(a.type),
    )

    for (const attribute of attributes) {
      if (!ProductAttributeModuleService.VALUE_TYPES.has(attribute.type)) {
        attribute.values = []
      }
    }

    if (!valueAttributes.length) {
      return
    }

    const values = await this.listProductAttributeValues(
      { attribute_id: valueAttributes.map((a) => a.id) },
      this.deriveValueConfig(config),
      sharedContext,
    )

    const valuesByAttribute = new Map<string, ProductAttributeValueDTO[]>()
    for (const value of values) {
      const key = value.attribute_id ?? ""
      const list = valuesByAttribute.get(key) ?? []
      list.push(value)
      valuesByAttribute.set(key, list)
    }

    for (const attribute of valueAttributes) {
      attribute.values = valuesByAttribute.get(attribute.id) ?? []
    }
  }

  @InjectManager()
  // @ts-expect-error — see class-level comment on the base/override signature gap.
  async listProductAttributes(
    filters?: Record<string, unknown>,
    config?: FindConfig<ProductAttributeDTO>,
    @MedusaContext() sharedContext?: Context,
  ): Promise<ProductAttributeDTO[]> {
    const wantsValues = this.wantsValues(config)

    const attributes = await super.listProductAttributes(
      filters,
      this.stripValuesFromConfig(config),
      sharedContext,
    )

    if (wantsValues && attributes.length) {
      await this.attachValues(attributes, config, sharedContext)
    }

    return attributes
  }

  @InjectManager()
  // @ts-expect-error — see class-level comment on the base/override signature gap.
  async listAndCountProductAttributes(
    filters?: Record<string, unknown>,
    config?: FindConfig<ProductAttributeDTO>,
    @MedusaContext() sharedContext?: Context,
  ): Promise<[ProductAttributeDTO[], number]> {
    const wantsValues = this.wantsValues(config)

    const [attributes, count] = await super.listAndCountProductAttributes(
      filters,
      this.stripValuesFromConfig(config),
      sharedContext,
    )

    if (wantsValues && attributes.length) {
      await this.attachValues(attributes, config, sharedContext)
    }

    return [attributes, count]
  }

  @InjectTransactionManager()
  // @ts-expect-error — see class-level comment on the base/override signature gap.
  async createProductAttributeValues(
    data: UpsertProductAttributeValueInput[],
    sharedContext?: Context,
  ): Promise<ProductAttributeValueDTO[]> {
    const attributeIds = Array.from(
      new Set(data.map((v) => v.attribute_id).filter(Boolean)),
    )
    const attributes = attributeIds.length
      ? await this.listProductAttributes(
        { id: attributeIds },
        { select: ["id", "product_id", "type"] },
        sharedContext,
      )
      : []
    const attributeById = new Map<string, { product_id?: string | null; type: string }>(
      attributes.map((a) => [a.id, a]),
    )

    const selectTypes = new Set<string>([
      AttributeType.SINGLE_SELECT,
      AttributeType.MULTI_SELECT,
    ])

    const input = data.map((value) => {
      const attribute = attributeById.get(value.attribute_id)
      const isProductScoped = !!attribute?.product_id
      const isSelectType = !!attribute && selectTypes.has(attribute.type)
      if (!value.handle && !isProductScoped && isSelectType && value.name) {
        return { ...value, handle: toHandle(value.name) }
      }
      return value
    })

    return super.createProductAttributeValues(input, sharedContext)
  }
}

export default ProductAttributeModuleService
