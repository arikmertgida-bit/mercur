import { ChildKeys, HttpMethod, InferInput, InferOutput, TypeError } from "./helpers";

export type ActionType = "query" | "mutate" | "delete";

export type ClientOptions = {
    baseUrl: string;
    fetchOptions?: Omit<RequestInit, "headers"> & {
        /**
         * A plain `HeadersInit` is captured once at `createClient()` time and
         * never re-evaluated, so it goes stale if header values (e.g. the
         * active UI language) change during the session. Pass a thunk to
         * resolve headers fresh on every request instead.
         */
        headers?: HeadersInit | (() => HeadersInit);
    };
    /**
     * Resolved fresh on every request and merged on top of `fetchOptions`'s
     * headers — use this for auth headers (e.g. a bearer token) that must
     * reflect the latest signed-in state rather than the state at
     * `createClient()` time.
     */
    headers?: () => Record<string, string>;
};

export type FetchOptionsInput = { fetchOptions?: RequestInit };

/**
 * Distributes over a union input so every member keeps its own keys; the
 * `undefined` member of an optional input drops out.
 */
export type StripFetchOptions<TInput> = TInput extends FetchOptionsInput
    ? Omit<TInput, "fetchOptions">
    : never;

type PathParams<TParamKeys extends string> = { [P in TParamKeys]: string };

type AddParamsToFn<Fn, TParamKeys extends string> =
    [TParamKeys] extends [never]
    ? Fn
    : Fn extends (input?: infer TInput) => infer TOutput
    ? (input: StripFetchOptions<TInput> & PathParams<TParamKeys> & FetchOptionsInput) => TOutput
    : Fn extends (input: infer TInput) => infer TOutput
    ? (input: StripFetchOptions<TInput> & PathParams<TParamKeys> & FetchOptionsInput) => TOutput
    : Fn;

/**
 * A route without a body generic carries Medusa's `validatedBody` default (the
 * top type, which also accepts `null`), a request-less one infers `void` —
 * neither has a payload to send.
 */
type HasNoInput<TInput> = [TInput] extends [void]
    ? true
    : [null] extends [TInput]
    ? true
    : false;

type InferFetchFn<
    TRequest,
    TResponse,
    TInput = InferInput<TRequest>,
    TOutput = InferOutput<TResponse>,
> = HasNoInput<TInput> extends true
    ? (input?: FetchOptionsInput) => Promise<TOutput>
    : (input: TInput & FetchOptionsInput) => Promise<TOutput>;

type MethodActions = { GET: "query"; POST: "mutate"; DELETE: "delete" };

type InferEndpointMethods<TRoutes, TParamKeys extends string> = {
    [M in keyof TRoutes & HttpMethod as MethodActions[M]]: TRoutes[M] extends (
        req: infer TReq,
        res: infer TRes
    ) => void
        ? AddParamsToFn<InferFetchFn<TReq, TRes>, TParamKeys>
        : never;
};

type ProcessRoutes<TRoutes, TParamKeys extends string = never> =
    InferEndpointMethods<TRoutes, TParamKeys> &
    {
        [K in ChildKeys<TRoutes>]: K extends `$${string}`
        ? ProcessRoutes<TRoutes[K], TParamKeys | (K & string)>
        : ProcessRoutes<TRoutes[K], TParamKeys>
    };

/**
 * `TRoutes` falls back to the top type when the generic is not passed, which
 * — unlike a route tree — accepts `null`.
 */
export type InferClient<TRoutes> = [null] extends [TRoutes]
    ? TypeError<`Looks like you forgot to pass the \`Routes\` generic type to the \`createClient\` function.`>
    : ProcessRoutes<TRoutes>;
