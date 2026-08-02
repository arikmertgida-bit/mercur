import {
    EmitEvents,
    InjectManager,
    InjectTransactionManager,
    MedusaContext,
    MedusaError,
    MedusaService,
} from "@medusajs/framework/utils"
import {
    CreatePayoutAccountDTO,
    CreatePayoutAccountResponse,
    CreatePayoutDTO,
    CreateOnboardingDTO,
    OnboardingDTO,
    PayoutAccountDTO,
    PayoutAccountStatus,
    PayoutDTO,
    PayoutWebhookActionInput,
    PayoutWebhookResult,
    PayoutModuleOptions,
    PayoutStatus,
    PAYOUT_MODULE_OPTION_DEFAULTS,
} from "@mercurjs/types"
import PayoutProviderService from "./provider-service"
import { Onboarding, Payout, PayoutAccount } from "../models"
import { Context, DAL, InferEntityType } from "@medusajs/framework/types"
import { EntityManager } from "@medusajs/framework/mikro-orm/knex"

type InjectedDependencies = {
    payoutProviderService: PayoutProviderService
    baseRepository: DAL.RepositoryService
}

export default class PayoutModuleService extends MedusaService({
    Onboarding,
    Payout,
    PayoutAccount,
}) {
    protected readonly payoutProviderService_: PayoutProviderService
    protected readonly baseRepository_: DAL.RepositoryService
    protected readonly options_: PayoutModuleOptions

    constructor({ payoutProviderService, baseRepository }: InjectedDependencies, options: PayoutModuleOptions) {
        super(...arguments)
        this.payoutProviderService_ = payoutProviderService
        this.baseRepository_ = baseRepository
        this.options_ = {
            ...PAYOUT_MODULE_OPTION_DEFAULTS,
            ...(options ?? {}),
        }
    }

    getOptions() {
        return {
            ...PAYOUT_MODULE_OPTION_DEFAULTS,
            ...(this.options_ ?? {}),
        }
    }

    @InjectManager()
    @EmitEvents()
    async createPayoutAccount(
        input: CreatePayoutAccountDTO,
        @MedusaContext() sharedContext?: Context<EntityManager>
    ): Promise<PayoutAccountDTO> {
        let payoutAccount: InferEntityType<typeof PayoutAccount> | null = null
        let providerAccount: CreatePayoutAccountResponse | null = null

        try {
            payoutAccount = await this.createPayoutAccounts(
                { data: input.data, context: input.context as Record<string, unknown> },
                sharedContext
            )

            providerAccount = await this.payoutProviderService_.createPayoutAccount({
                context: {
                    idempotency_key: payoutAccount.id,
                    ...input.context
                },
                data: {
                    ...input.data,
                    account_id: payoutAccount.id,
                }
            })

            payoutAccount = await this.updatePayoutAccounts(
                {
                    id: payoutAccount.id,
                    data: providerAccount.data,
                    status: providerAccount.status
                },
                sharedContext
            )
        } catch (error) {
            if (providerAccount && payoutAccount?.id) {
                await this.updatePayoutAccounts(
                    {
                        id: payoutAccount.id,
                        data: providerAccount.data,
                        status: providerAccount.status,
                    },
                    sharedContext
                ).catch(() => null)
            } else if (payoutAccount?.id) {
                await this.deletePayoutAccounts(payoutAccount.id, sharedContext)
            }
            throw error
        }

        return await this.baseRepository_.serialize<PayoutAccountDTO>(payoutAccount)
    }

    @InjectTransactionManager()
    @EmitEvents()
    async createOnboarding(
        input: CreateOnboardingDTO,
        @MedusaContext() sharedContext?: Context<EntityManager>
    ): Promise<OnboardingDTO> {
        const payoutAccount = await this.retrievePayoutAccount(input.account_id, {
            select: ['data'],
            relations: ['onboarding']
        }, sharedContext)

        const providerData = await this.payoutProviderService_.createOnboarding(
            {
                context: {
                    idempotency_key: input.account_id,
                    ...input.context
                },
                data: {
                    // `input.data` is caller-supplied (vendor API request body) and
                    // may only add fields the provider doesn't already know (e.g.
                    // refresh_url/return_url) — persisted `payoutAccount.data` (which
                    // carries the provider's own account identity, e.g. Stripe's
                    // `id`) must win on conflicts so a seller can never redirect the
                    // onboarding call at another seller's connected account.
                    ...input.data,
                    ...payoutAccount.data
                }
            }
        )

        const upsertOnboardingData = {
            ...(payoutAccount.onboarding ? { id: payoutAccount.onboarding.id } : {}),
            account: input.account_id,
            data: providerData.data,
            context: input.context as Record<string, unknown>
        }

        let onboarding: InferEntityType<typeof Onboarding>
        if (!payoutAccount.onboarding) {
            onboarding = await this.createOnboardings(
                upsertOnboardingData,
                sharedContext
            )
        } else {
            onboarding = await this.updateOnboardings(
                upsertOnboardingData,
                sharedContext
            )
        }

        return await this.baseRepository_.serialize<OnboardingDTO>(onboarding)
    }

    @InjectManager()
    @EmitEvents()
    // @ts-expect-error — TypeScript cannot apply these decorators to a method with
    // public overload signatures, only a single implementation signature; the base
    // `MedusaService(...)`'s generated member is seen as a property, not a method,
    // once decorated. Real third-party (Medusa/TypeScript) type-system boundary.
    async createPayouts(
        input: CreatePayoutDTO,
        @MedusaContext() sharedContext?: Context<EntityManager>
    ): Promise<PayoutDTO> {
        const { payout, payoutAccount } = await this.createPayouts_(input, sharedContext)

        let updated: InferEntityType<typeof Payout>
        try {
            const providerResponse = await this.payoutProviderService_.createPayout({
                account_id: input.account_id,
                amount: input.amount,
                currency_code: input.currency_code,
                context: {
                    idempotency_key: payout.id,
                    ...input.context
                },
                data: {
                    ...payoutAccount.data,
                    ...input.data
                }
            })

            updated = await this.updatePayouts(
                {
                    id: payout.id,
                    data: providerResponse.data,
                    status: providerResponse.status,
                },
                sharedContext
            )
        } catch (error) {
            await this.deletePayouts(payout.id, sharedContext).catch(() => null)
            throw error
        }

        return await this.baseRepository_.serialize<PayoutDTO>(updated)
    }

    @InjectTransactionManager()
    protected async createPayouts_(
        input: CreatePayoutDTO,
        @MedusaContext() sharedContext?: Context<EntityManager>
    ): Promise<{
        payout: InferEntityType<typeof Payout>
        payoutAccount: InferEntityType<typeof PayoutAccount>
    }> {
        const payoutAccount = await this.retrievePayoutAccount(input.account_id, {
            select: ['id', 'status', 'data']
        }, sharedContext)

        if (payoutAccount.status !== PayoutAccountStatus.ACTIVE) {
            throw new MedusaError(
                MedusaError.Types.NOT_ALLOWED,
                `Account '${input.account_id}' is not active`
            )
        }

        const payout = await super.createPayouts(
            {
                amount: input.amount,
                currency_code: input.currency_code,
                account_id: payoutAccount.id,
                status: PayoutStatus.PENDING,
            },
            sharedContext
        )

        return { payout, payoutAccount }
    }

    async getWebhookActionAndData(
        input: PayoutWebhookActionInput
    ): Promise<PayoutWebhookResult> {
        return await this.payoutProviderService_.getWebhookActionAndData(input)
    }
}
