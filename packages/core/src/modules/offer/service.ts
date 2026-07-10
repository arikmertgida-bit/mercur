import {
  InjectManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils"
import { Context, DAL, FindConfig } from "@medusajs/framework/types"
import { SqlEntityManager } from "@medusajs/framework/mikro-orm/postgresql"
import { OfferDTO } from "@mercurjs/types"

import { Offer } from "./models"

type FilterValue = string | string[]
type OfferFilters = {
  group_by_seller?: boolean
  product_id?: FilterValue
  seller_id?: FilterValue
  id?: FilterValue
  [key: string]: FilterValue | boolean | undefined
}

const toArray = (value: FilterValue): string[] =>
  (Array.isArray(value) ? value : [value]).map(String)

/**
 * TypeScript cannot apply `@InjectManager` to a method with public overload
 * signatures — only a single implementation signature — and
 * `MedusaService(...)`'s generated filter/return types are anonymous
 * structural types inferred from the DML model schema that don't line up
 * 1:1 with our hand-authored `@mercurjs/types` DTOs (confirmed via `tsc`).
 * The `@ts-expect-error` uses below are at that real third-party
 * (Medusa/TypeScript) type-system boundary, not a shortcut.
 */
class OfferModuleService extends MedusaService({
  Offer,
}) {
  protected readonly baseRepository_: DAL.RepositoryService

  @InjectManager()
  // @ts-expect-error — see class-level comment on the base/override signature gap.
  async listOffers(
    filters: OfferFilters = {},
    config: FindConfig<OfferDTO> = {},
    @MedusaContext() sharedContext: Context = {}
  ): Promise<OfferDTO[]> {
    if (!filters.group_by_seller) {
      return super.listOffers(filters, config, sharedContext)
    }
    const [offers] = await this.listGroupedOffersBySeller_(
      filters,
      config,
      sharedContext
    )
    return offers
  }

  @InjectManager()
  // @ts-expect-error — see class-level comment on the base/override signature gap.
  async listAndCountOffers(
    filters: OfferFilters = {},
    config: FindConfig<OfferDTO> = {},
    @MedusaContext() sharedContext: Context = {}
  ): Promise<[OfferDTO[], number]> {
    if (!filters.group_by_seller) {
      return super.listAndCountOffers(filters, config, sharedContext)
    }
    return this.listGroupedOffersBySeller_(filters, config, sharedContext)
  }

  private async listGroupedOffersBySeller_(
    filters: OfferFilters,
    config: FindConfig<OfferDTO>,
    sharedContext: Context
  ): Promise<[OfferDTO[], number]> {
    const { group_by_seller: _flag, ...rest } = filters
    const skip = config.skip ?? 0
    const take = config.take ?? 20

    const manager = this.baseRepository_.getActiveManager<SqlEntityManager>()
    const knex = manager.getKnex()

    const scoped = () => {
      const qb = knex("offer").whereNull("deleted_at")
      if (rest.product_id !== undefined) {
        qb.whereIn("product_id", toArray(rest.product_id))
      }
      if (rest.seller_id !== undefined) {
        qb.whereIn("seller_id", toArray(rest.seller_id))
      }
      return qb
    }

    const idRows = (await scoped()
      .distinctOn("product_id", "seller_id")
      .select("id")
      .orderBy([
        { column: "product_id" },
        { column: "seller_id" },
        { column: "created_at", order: "desc" },
      ])
      .limit(take)
      .offset(skip)) as Array<{ id: string }>

    const countRow = (await knex
      .count({ count: "*" })
      .from(
        scoped().groupBy("product_id", "seller_id").select(knex.raw("1")).as(
          "groups"
        )
      )
      .first()) as { count?: string | number } | undefined
    const count = Number(countRow?.count ?? 0)

    const ids = idRows.map((row) => row.id)
    if (!ids.length) {
      return [[], count]
    }

    const offers = await super.listOffers(
      { id: ids },
      { ...config, skip: 0, take: ids.length },
      sharedContext
    )

    const rank = new Map(ids.map((id, index) => [id, index]))
    offers.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))

    const countRows = (await scoped()
      .groupBy("product_id", "seller_id")
      .select("product_id", "seller_id")
      .count({ variant_count: "*" })) as Array<{
      product_id: string
      seller_id: string
      variant_count: string | number
    }>

    const variantCountByGroup = new Map(
      countRows.map((row) => [
        `${row.product_id}:${row.seller_id}`,
        Number(row.variant_count),
      ])
    )

    for (const offer of offers) {
      offer.variant_count =
        variantCountByGroup.get(`${offer.product_id}:${offer.seller_id}`) ?? 0
    }

    return [offers, count]
  }
}

export default OfferModuleService
