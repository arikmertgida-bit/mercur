import { ChildKeys, InferInput, InferOutput, TypeError } from "./helpers";

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
};

type AddParamsToFn<Fn, TParams> =
    keyof TParams extends never
    ? Fn
    : Fn extends (input?: infer TInput) => infer TOutput
    ? (input: (TInput extends Record<string, any> ? Omit<TInput, 'fetchOptions'> : {}) & TParams & { fetchOptions?: RequestInit }) => TOutput
    : Fn extends (input: infer TInput) => infer TOutput
    ? (input: (TInput extends Record<string, any> ? Omit<TInput, 'fetchOptions'> : {}) & TParams & { fetchOptions?: RequestInit }) => TOutput
    : Fn;

type InferFetchFn<
    TRequest,
    TResponse,
    TInput = InferInput<TRequest>,
    TOutput = InferOutput<TResponse>,
> = [TInput] extends [Record<string, any>]
    ? (input: TInput & { fetchOptions?: RequestInit }) => Promise<TOutput>
    : (input?: { fetchOptions?: RequestInit }) => Promise<TOutput>;

type InferEndpointMethods<TRoutes, TParams> =
    (TRoutes extends { GET: (req: infer TReq, res: infer TRes) => any }
        ? { query: AddParamsToFn<InferFetchFn<TReq, TRes>, TParams> }
        : {}) &
    (TRoutes extends { POST: (req: infer TReq, res: infer TRes) => any }
        ? { mutate: AddParamsToFn<InferFetchFn<TReq, TRes>, TParams> }
        : {}) &
    (TRoutes extends { DELETE: (req: infer TReq, res: infer TRes) => any }
        ? { delete: AddParamsToFn<InferFetchFn<TReq, TRes>, TParams> }
        : {});

type ProcessRoutes<TRoutes, TParams = {}> =
    InferEndpointMethods<TRoutes, TParams> &
    {
        [K in ChildKeys<TRoutes>]: K extends `$${string}`
        ? ProcessRoutes<TRoutes[K], TParams & { [P in K]: string }>
        : ProcessRoutes<TRoutes[K], TParams>
    };

export type InferClient<TRoutes> = TRoutes extends Record<string, any>
    ? ProcessRoutes<TRoutes>
    : TypeError<`Looks like you forgot to pass the \`Routes\` generic type to the \`createClient\` function.`>;


export type AnyClient = InferClient<any>;
