import { InjectManager, MedusaContext, MedusaError, MedusaService } from "@medusajs/framework/utils"
import { Context, DAL } from "@medusajs/framework/types"
import { EntityManager } from "@medusajs/framework/mikro-orm/knex"
import { z } from "zod"

import { Conversation } from "./models/conversation"
import { Message } from "./models/message"
import { ChatBlock } from "./models/chat-block"
import {
  CursorPaginatedResult,
  ConversationDTO,
  MessageDTO,
  MessagingModuleOptions,
  ResolvedMessagingModuleOptions,
  MESSAGING_MODULE_OPTION_DEFAULTS,
} from "./types/common"

const TABLE_CONVERSATION = "conversation"
const TABLE_MESSAGE = "message"
const TABLE_CHAT_BLOCK = "chat_block"
const MAX_PREVIEW_LENGTH = 100

type AdminConversationSearchRow = ConversationDTO & {
  seller_name: string | null
  buyer_first_name: string | null
  buyer_last_name: string | null
  buyer_email: string | null
}

export type AdminConversationSearchResult = AdminConversationSearchRow & {
  buyer_name: string
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

type InjectedDependencies = {
  baseRepository: DAL.RepositoryService
}

// Cursors come back from the client, so a decoded cursor is validated
// before any of its values reach a query.
const CursorSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]))

type CursorValues = z.infer<typeof CursorSchema>

export function encodeCursor(values: CursorValues): string {
  return Buffer.from(JSON.stringify(values)).toString("base64url")
}

export function decodeCursor(cursor: string): CursorValues | null {
  try {
    const parsed = CursorSchema.safeParse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"))
    )
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

// Knex returns timestamps as Date objects; cursors carry them as ISO strings.
function toCursorTimestamp(value: Date | string | null): string | null {
  return value instanceof Date ? value.toISOString() : value
}

// `@InjectManager()` always provides the manager; a missing one is a wiring bug.
function getKnex(
  sharedContext: Context<EntityManager> | undefined
): ReturnType<EntityManager["getKnex"]> {
  const manager = sharedContext?.manager
  if (!manager) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Messaging: no entity manager in the shared context"
    )
  }
  return manager.getKnex()
}

class MessagingModuleService extends MedusaService({
  Conversation,
  Message,
  ChatBlock,
}) {
  protected readonly options_: ResolvedMessagingModuleOptions

  constructor(_container: InjectedDependencies, options?: MessagingModuleOptions) {
    // eslint-disable-next-line prefer-rest-params
    super(...arguments)
    this.options_ = {
      rateLimits: {
        ...MESSAGING_MODULE_OPTION_DEFAULTS.rateLimits,
        ...(options?.rateLimits ?? {}),
      },
    }
  }

  getOptions(): ResolvedMessagingModuleOptions {
    return this.options_
  }

  @InjectManager()
  async checkBuyersBlocked(
    buyerIds: string[],
    @MedusaContext() sharedContext?: Context<EntityManager>
  ): Promise<Set<string>> {
    if (buyerIds.length === 0) return new Set()
    const knex = getKnex(sharedContext)
    const rows: { customer_id: string }[] = await knex(TABLE_CHAT_BLOCK)
      .select("customer_id")
      .whereIn("customer_id", buyerIds)
      .whereNull("deleted_at")
    return new Set(rows.map((r) => r.customer_id))
  }

  @InjectManager()
  async getBlockDetail(
    customerId: string,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ): Promise<{ blocked: boolean; reason: string | null }> {
    const knex = getKnex(sharedContext)
    const row: { reason: string | null } | undefined = await knex(TABLE_CHAT_BLOCK)
      .select("reason")
      .where("customer_id", customerId)
      .whereNull("deleted_at")
      .first()

    return row
      ? { blocked: true, reason: row.reason }
      : { blocked: false, reason: null }
  }

  @InjectManager()
  async listConversationsCursor(
    filter: { buyer_id?: string; seller_id?: string },
    pagination: { cursor?: string | null; limit?: number },
    @MedusaContext() sharedContext?: Context<EntityManager>
  ): Promise<CursorPaginatedResult<ConversationDTO>> {
    const knex = getKnex(sharedContext)
    const limit = Math.min(pagination.limit ?? 20, 50)

    let query = knex(TABLE_CONVERSATION)
      .select("*")
      .where("deleted_at", null)
      .orderByRaw("last_message_at DESC NULLS LAST, id DESC")
      .limit(limit + 1)

    if (filter.buyer_id) {
      query = query.where("buyer_id", filter.buyer_id)
    }

    if (filter.seller_id) {
      query = query.where("seller_id", filter.seller_id)
    }

    if (pagination.cursor) {
      const decoded = decodeCursor(pagination.cursor)
      const lastMessageAt = decoded?.last_message_at
      const cursorId = decoded?.id
      if (lastMessageAt && cursorId) {
        query = query.where(function () {
          this.where("last_message_at", "<", lastMessageAt)
            .orWhere(function () {
              this.where("last_message_at", "=", lastMessageAt)
                .andWhere("id", "<", cursorId)
            })
        })
      }
    }

    const rows: ConversationDTO[] = await query

    const hasMore = rows.length > limit
    const data = hasMore ? rows.slice(0, limit) : rows

    let next_cursor: string | null = null
    const lastRow = hasMore ? data.at(-1) : undefined
    if (lastRow) {
      next_cursor = encodeCursor({
        last_message_at: toCursorTimestamp(lastRow.last_message_at),
        id: lastRow.id,
      })
    }

    return { data, next_cursor }
  }

  @InjectManager()
  async listMessagesCursor(
    conversationId: string,
    pagination: { cursor?: string | null; limit?: number },
    @MedusaContext() sharedContext?: Context<EntityManager>
  ): Promise<CursorPaginatedResult<MessageDTO>> {
    const knex = getKnex(sharedContext)
    const limit = Math.min(pagination.limit ?? 30, 100)

    let query = knex(TABLE_MESSAGE)
      .select("*")
      .where("conversation_id", conversationId)
      .where("deleted_at", null)
      .orderByRaw("created_at DESC, id DESC")
      .limit(limit + 1)

    if (pagination.cursor) {
      const decoded = decodeCursor(pagination.cursor)
      const createdAt = decoded?.created_at
      const cursorId = decoded?.id
      if (createdAt && cursorId) {
        query = query.where(function () {
          this.where("created_at", "<", createdAt)
            .orWhere(function () {
              this.where("created_at", "=", createdAt)
                .andWhere("id", "<", cursorId)
            })
        })
      }
    }

    const rows: MessageDTO[] = await query

    const hasMore = rows.length > limit
    const data = hasMore ? rows.slice(0, limit) : rows

    let next_cursor: string | null = null
    const lastRow = hasMore ? data.at(-1) : undefined
    if (lastRow) {
      next_cursor = encodeCursor({
        created_at: toCursorTimestamp(lastRow.created_at),
        id: lastRow.id,
      })
    }

    return { data, next_cursor }
  }

  /**
   * Cross-module admin search: joins conversation with seller + customer
   * tables via raw Knex for performance (avoids N+1 queries). This is
   * intentional — admin oversight requires denormalized data in a single
   * paginated query. Module isolation is preserved at the application
   * layer; this method is only used by the admin search route.
   */
  @InjectManager()
  async searchConversationsAdmin(
    filter: {
      seller_name?: string
      buyer_name?: string
      date_from?: string
      date_to?: string
      context_type?: string
      context_id?: string
    },
    pagination: { cursor?: string | null; limit?: number },
    @MedusaContext() sharedContext?: Context<EntityManager>
  ): Promise<CursorPaginatedResult<AdminConversationSearchResult>> {
    const knex = getKnex(sharedContext)
    const limit = Math.min(pagination.limit ?? 20, 50)

    let query = knex(`${TABLE_CONVERSATION} as c`)
      .select(
        "c.*",
        "s.name as seller_name",
        "cust.first_name as buyer_first_name",
        "cust.last_name as buyer_last_name",
        "cust.email as buyer_email"
      )
      .leftJoin(
        "seller_seller_messaging_conversation as sc",
        "sc.conversation_id",
        "c.id"
      )
      .leftJoin("seller as s", "s.id", "sc.seller_id")
      .leftJoin(
        "customer_customer_messaging_conversation as cc",
        "cc.conversation_id",
        "c.id"
      )
      .leftJoin("customer as cust", "cust.id", "cc.customer_id")
      .where("c.deleted_at", null)
      .orderByRaw("c.last_message_at DESC NULLS LAST, c.id DESC")
      .limit(limit + 1)

    if (filter.seller_name) {
      query = query.whereILike("s.name", `%${escapeLike(filter.seller_name)}%`)
    }

    if (filter.buyer_name) {
      const escaped = escapeLike(filter.buyer_name)
      query = query.where(function () {
        this.whereILike("cust.first_name", `%${escaped}%`)
          .orWhereILike("cust.last_name", `%${escaped}%`)
      })
    }

    if (filter.date_from) {
      query = query.where("c.last_message_at", ">=", filter.date_from)
    }

    if (filter.date_to) {
      query = query.where("c.last_message_at", "<=", filter.date_to)
    }

    if (filter.context_type || filter.context_id) {
      query = query.whereExists(function () {
        this.select(knex.raw("1"))
          .from(`${TABLE_MESSAGE} as m`)
          .whereRaw("m.conversation_id = c.id")

        if (filter.context_type) {
          this.where("m.context_type", filter.context_type)
        }
        if (filter.context_id) {
          this.where("m.context_id", filter.context_id)
        }
      })
    }

    if (pagination.cursor) {
      const decoded = decodeCursor(pagination.cursor)
      const lastMessageAt = decoded?.last_message_at
      const cursorId = decoded?.id
      if (lastMessageAt && cursorId) {
        query = query.where(function () {
          this.where("c.last_message_at", "<", lastMessageAt)
            .orWhere(function () {
              this.where("c.last_message_at", "=", lastMessageAt)
                .andWhere("c.id", "<", cursorId)
            })
        })
      }
    }

    const rows: AdminConversationSearchRow[] = await query

    const hasMore = rows.length > limit
    const data = (hasMore ? rows.slice(0, limit) : rows).map((row) => ({
      ...row,
      buyer_name: [row.buyer_first_name, row.buyer_last_name]
        .filter(Boolean)
        .join(" "),
    }))

    let next_cursor: string | null = null
    const lastRow = hasMore ? data.at(-1) : undefined
    if (lastRow) {
      next_cursor = encodeCursor({
        last_message_at: toCursorTimestamp(lastRow.last_message_at),
        id: lastRow.id,
      })
    }

    return { data, next_cursor }
  }

  @InjectManager()
  async getUnreadCountTotal(
    filter: { buyer_id?: string; seller_id?: string },
    @MedusaContext() sharedContext?: Context<EntityManager>
  ): Promise<number> {
    const knex = getKnex(sharedContext)

    const countField = filter.buyer_id
      ? "unread_count_customer"
      : "unread_count_seller"

    let query = knex(TABLE_CONVERSATION)
      .sum({ total: countField })
      .where("deleted_at", null)

    if (filter.buyer_id) {
      query = query.where("buyer_id", filter.buyer_id)
    }

    if (filter.seller_id) {
      query = query.where("seller_id", filter.seller_id)
    }

    const [result] = await query

    return Number(result?.total ?? 0)
  }

  @InjectManager()
  async createMessageAtomic(
    data: {
      conversation_id: string
      sender_id: string
      sender_type: "customer" | "seller"
      body: string
      context_type?: string | null
      context_id?: string | null
      context_label?: string | null
    },
    @MedusaContext() sharedContext?: Context<EntityManager>
  ): Promise<MessageDTO> {
    const knex = getKnex(sharedContext)

    const preview = data.body.substring(0, MAX_PREVIEW_LENGTH)
    const recipientCounterField =
      data.sender_type === "customer"
        ? "unread_count_seller"
        : "unread_count_customer"

    const now = new Date()

    return await knex.transaction(async (trx) => {
      const [message] = await trx(TABLE_MESSAGE)
        .insert({
          id: `msg_${generateId()}`,
          conversation_id: data.conversation_id,
          sender_id: data.sender_id,
          sender_type: data.sender_type,
          body: data.body,
          context_type: data.context_type ?? null,
          context_id: data.context_id ?? null,
          context_label: data.context_label ?? null,
          read_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })
        .returning("*")

      await trx(TABLE_CONVERSATION)
        .where("id", data.conversation_id)
        .update({
          last_message_preview: preview,
          last_message_sender_type: data.sender_type,
          last_message_at: now,
          [recipientCounterField]: knex.raw(`?? + 1`, [recipientCounterField]),
          updated_at: now,
        })

      return message
    })
  }

  @InjectManager()
  async markMessagesReadAtomic(
    conversationId: string,
    readerType: "customer" | "seller",
    @MedusaContext() sharedContext?: Context<EntityManager>
  ): Promise<number> {
    const knex = getKnex(sharedContext)

    const senderType = readerType === "customer" ? "seller" : "customer"
    const counterField =
      readerType === "customer"
        ? "unread_count_customer"
        : "unread_count_seller"

    const now = new Date()

    return await knex.transaction(async (trx) => {
      const updated = await trx(TABLE_MESSAGE)
        .where("conversation_id", conversationId)
        .where("sender_type", senderType)
        .whereNull("read_at")
        .whereNull("deleted_at")
        .update({
          read_at: now,
          updated_at: now,
        })

      await trx(TABLE_CONVERSATION)
        .where("id", conversationId)
        .update({
          [counterField]: 0,
          updated_at: now,
        })

      return updated
    })
  }
}

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 16)
}

export default MessagingModuleService
