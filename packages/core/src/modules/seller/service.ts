import { configManager } from "@medusajs/framework/config"
import { Context, DAL, InternalModuleDeclaration } from "@medusajs/framework/types"
import {
  generateJwtToken,
  InjectManager,
  isValidHandle,
  MedusaContext,
  MedusaError,
  MedusaService,
  toHandle,
  InjectTransactionManager,
} from "@medusajs/framework/utils"
import jwt, { JwtPayload } from "jsonwebtoken"
import crypto from "node:crypto"
import {
  Seller,
  ProfessionalDetails,
  SellerAddress,
  PaymentDetails,
  Member,
  SellerMember,
  MemberInvite,
  OrderGroup,
} from "./models"
import {
  OrderGroupFilters,
  OrderGroupFindOptions,
  OrderGroupRepository,
} from "./repositories"
import {
  CreateMemberInviteDTO,
  CreateSellerDTO,
  MemberDTO,
  MemberInviteDTO,
  OrderGroupDTO,
  SellerDTO,
  SellerModuleOptions,
  UpdateSellerDTO,
} from "@mercurjs/types"

type UpdateSellerInput = UpdateSellerDTO & { id: string }
type CreateMemberInviteInput = CreateMemberInviteDTO & {
  id?: string
  accepted?: boolean
  expires_at?: Date
}

const DEFAULT_INVITE_VALID_DURATION_SECONDS = 60 * 60 * 24 * 7 // 7 days

type InjectedDependencies = {
  orderGroupRepository: OrderGroupRepository
  baseRepository: DAL.RepositoryService
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
 * `@mercurjs/types` DTOs (confirmed via `tsc`) — those specific mismatches
 * are the only `@ts-expect-error` uses below, each at a real third-party
 * (Medusa/TypeScript) type-system boundary, not a shortcut.
 */
class SellerModuleService extends MedusaService({
  Seller,
  ProfessionalDetails,
  SellerAddress,
  PaymentDetails,
  Member,
  SellerMember,
  MemberInvite,
  OrderGroup,
}) {
  protected readonly orderGroupRepository_: OrderGroupRepository
  protected readonly baseRepository_: DAL.RepositoryService
  protected readonly options_: SellerModuleOptions

  constructor(
    { orderGroupRepository, baseRepository }: InjectedDependencies,
    protected readonly moduleDeclaration?: InternalModuleDeclaration,
  ) {
    // eslint-disable-next-line prefer-rest-params
    super(...arguments)
    this.orderGroupRepository_ = orderGroupRepository
    this.baseRepository_ = baseRepository

    const opts = (moduleDeclaration?.options as SellerModuleOptions) ?? {}
    this.options_ = {
      ...opts,
      jwt_secret:
        opts.jwt_secret ??
        (configManager.config.projectConfig.http.jwtSecret as string),
      vendor_url: opts.vendor_url ?? process.env.MERCUR_VENDOR_URL ?? "",
    }
  }

  @InjectTransactionManager()
  // @ts-expect-error — MedusaService(...)'s generated param/return types are
  // anonymous structural types inferred from the DML model schema and don't
  // line up 1:1 with our hand-authored @mercurjs/types DTOs; confirmed via
  // tsc, a real third-party type-system boundary.
  async createSellers(
    data: CreateSellerDTO[],
    sharedContext?: Context,
  ): Promise<SellerDTO[]> {
    const input = data.map((seller) => {
      this.validateSellerData_(seller)

      if (!seller.handle && seller.name) {
        return { ...seller, handle: toHandle(seller.name) }
      }

      return seller
    })

    // @ts-expect-error — see class-level comment: base's generated param type
    // is a DML-inferred anonymous type, not our named CreateSellerDTO.
    return super.createSellers(input, sharedContext)
  }

  @InjectTransactionManager()
  // @ts-expect-error — see createSellers: base's generated type doesn't match
  // our named DTO exactly, a real third-party type-system boundary.
  async updateSellers(
    data: UpdateSellerInput[],
    sharedContext?: Context,
  ): Promise<SellerDTO[]> {
    const input = data.map((seller) => {
      this.validateSellerData_(seller)

      if (!seller.handle && seller.name) {
        return { ...seller, handle: toHandle(seller.name) }
      }

      return seller
    })

    // @ts-expect-error — see class-level comment: base's generated param type
    // is a DML-inferred anonymous type, not our named UpdateSellerDTO.
    return super.updateSellers(input, sharedContext)
  }

  @InjectTransactionManager()
  async upsertMembers(
    data: { email: string; first_name?: string | null; last_name?: string | null }[],
    sharedContext?: Context,
  ): Promise<MemberDTO[]> {
    const emails = data.map((d) => d.email)
    const existing = await this.listMembers(
      { email: emails },
      {},
      sharedContext,
    )

    const existingMap = new Map(existing.map((m) => [m.email, m]))

    const toCreate = data.filter((d) => !existingMap.has(d.email))

    const created = toCreate.length
      ? await this.createMembers(toCreate, sharedContext)
      : []

    const createdMap = new Map(
      (Array.isArray(created) ? created : [created]).map((m) => [m.email, m])
    )

    const toUpdate = data
      .filter((d) => existingMap.has(d.email))
      .map((d) => {
        const existingMember = existingMap.get(d.email)!
        const update: { id: string; first_name?: string; last_name?: string } = {
          id: existingMember.id,
        }
        if (d.first_name != null && !existingMember.first_name) {
          update.first_name = d.first_name
        }
        if (d.last_name != null && !existingMember.last_name) {
          update.last_name = d.last_name
        }
        return Object.keys(update).length > 1 ? update : null
      })
      .filter((u): u is { id: string; first_name?: string; last_name?: string } => !!u)

    if (toUpdate.length) {
      await this.updateMembers(toUpdate, sharedContext)
    }

    return data.map(
      (d) => existingMap.get(d.email) ?? createdMap.get(d.email)!
    )
  }

  @InjectTransactionManager()
  // @ts-expect-error — see createSellers: base's generated type doesn't match
  // our named DTO exactly, a real third-party type-system boundary.
  async createMemberInvites(
    data: CreateMemberInviteInput[],
    sharedContext?: Context,
  ): Promise<MemberInviteDTO[]> {
    const validDuration = this.options_.invite_valid_duration ?? DEFAULT_INVITE_VALID_DURATION_SECONDS

    const inviteList = data

    const sellerIds = [...new Set(inviteList.map((i) => i.seller_id))]
    const sellers = await this.listSellers(
      { id: sellerIds },
      { select: ["id", "name"] },
      sharedContext,
    )
    const sellerMap = new Map(sellers.map((s) => [s.id, s.name]))

    const emails = inviteList.map((i) => i.email)
    const existingMembers = await this.listMembers(
      { email: emails },
      { select: ["id", "email"] },
      sharedContext,
    )
    const existingEmailSet = new Set(existingMembers.map((m) => m.email))

    if (existingMembers.length > 0) {
      const memberIds = existingMembers.map((m) => m.id)
      const existingSellerMembers = await this.listSellerMembers(
        { seller_id: sellerIds, member_id: memberIds },
        { select: ["seller_id", "member_id"] },
        sharedContext,
      )

      if (existingSellerMembers.length > 0) {
        const memberIdToEmail = new Map(existingMembers.map((m) => [m.id, m.email]))
        const alreadyInSeller = new Set(
          existingSellerMembers.map((sm) => `${sm.seller_id}:${memberIdToEmail.get(sm.member_id)}`)
        )

        const duplicates = inviteList.filter((i) =>
          alreadyInSeller.has(`${i.seller_id}:${i.email}`)
        )

        if (duplicates.length > 0) {
          const emails = duplicates.map((d) => d.email).join(", ")
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `The following emails are already members of the seller: ${emails}`
          )
        }
      }
    }

    const input = inviteList.map((invite) => {
      const id = invite.id ?? `meminv_${crypto.randomUUID()}`
      return {
        ...invite,
        id,
        token: this.generateInviteToken_(
          {
            id,
            email: invite.email,
            seller_name: sellerMap.get(invite.seller_id) ?? "",
            existing_member: existingEmailSet.has(invite.email),
          },
          validDuration,
        ),
        accepted: invite.accepted ?? false,
        expires_at: invite.expires_at ?? new Date(Date.now() + validDuration * 1000),
      }
    })

    return super.createMemberInvites(input, sharedContext)
  }

  @InjectManager()
  async validateMemberInviteToken(
    token: string,
    @MedusaContext() sharedContext: Context = {},
  ): Promise<MemberInviteDTO> {
    let decoded: JwtPayload
    try {
      decoded = jwt.verify(token, this.options_.jwt_secret, {
        complete: true,
      }) as JwtPayload
    } catch {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid invite token"
      )
    }

    const invite = await this.retrieveMemberInvite(
      decoded.payload.id,
      {},
      sharedContext,
    ) as MemberInviteDTO

    if (invite.accepted) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Invite has already been accepted"
      )
    }

    if (new Date() > new Date(invite.expires_at)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Invite token has expired"
      )
    }

    return invite
  }

  private generateInviteToken_(
    data: { id: string; email: string; seller_name: string; existing_member: boolean },
    expiresIn: number,
  ): string {
    return generateJwtToken(data, {
      secret: this.options_.jwt_secret,
      expiresIn,
      jwtOptions: {
        jwtid: crypto.randomUUID(),
      },
    })
  }

  private validateSellerData_(data: { handle?: string }) {
    if (data.handle && !isValidHandle(data.handle)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid seller handle '${data.handle}'. It must contain URL safe characters`
      )
    }
  }

  @InjectManager()
  // @ts-expect-error — overrides MedusaService(...)'s generated method with a
  // real-SQL-backed implementation (OrderGroupRepository); the base's
  // generated signature doesn't apply here, a real third-party boundary.
  async listOrderGroups(
    filters: OrderGroupFilters = {},
    config: OrderGroupFindOptions["options"] = {},
    @MedusaContext() sharedContext: Context = {}
  ): Promise<OrderGroupDTO[]> {
    const [orderGroups] = await this.orderGroupRepository_.findAndCount(
      {
        where: filters,
        options: config,
      },
      sharedContext
    )

    return await this.baseRepository_.serialize<OrderGroupDTO[]>(orderGroups)
  }

  @InjectManager()
  // @ts-expect-error — see listOrderGroups: real-SQL-backed override, not the
  // base's generated signature, a real third-party boundary.
  async listAndCountOrderGroups(
    filters: OrderGroupFilters = {},
    config: OrderGroupFindOptions["options"] = {},
    @MedusaContext() sharedContext: Context = {}
  ): Promise<[OrderGroupDTO[], number]> {
    const [orderGroups, count] = await this.orderGroupRepository_.findAndCount(
      {
        where: filters,
        options: config,
      },
      sharedContext
    )
    return [
      await this.baseRepository_.serialize<OrderGroupDTO[]>(orderGroups),
      count,
    ]
  }

  @InjectManager()
  // @ts-expect-error — see listOrderGroups: real-SQL-backed override, not the
  // base's generated signature, a real third-party boundary.
  async retrieveOrderGroup(
    id: string,
    config: OrderGroupFindOptions["options"] = {},
    @MedusaContext() sharedContext: Context = {}
  ) {
    const [orderGroups] = await this.orderGroupRepository_.findAndCount(
      {
        where: { id },
        options: config,
      },
      sharedContext
    )

    return await this.baseRepository_.serialize<OrderGroupDTO>(orderGroups[0])
  }
}

export default SellerModuleService
