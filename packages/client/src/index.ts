import qs from "qs";
import { createRecursiveProxy } from "./create-proxy";
import { ActionType, ClientOptions } from "./types";
import type { InferClient } from "./types";
export type { InferClient } from "./types";
import { kebabCase } from "./utils";

type JsonPrimitive = string | number | boolean | null
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]
type JsonValue = JsonPrimitive | JsonObject | JsonArray
type JsonRecord = Record<string, JsonValue>
type ClientPayloadEntry = JsonValue | Blob | (JsonValue | Blob)[]
type ClientPayload = Record<string, ClientPayloadEntry>
type ClientRequestInput = ClientPayload & {
    fetchOptions?: RequestInit
}

type DistributiveOmit<T, K extends PropertyKey> = T extends object ? Omit<T, K> : never;

export type InferClientInput<T> = T extends (input: infer I) => infer _R
    ? DistributiveOmit<I, 'fetchOptions'>
    : T extends (input?: infer I) => infer _R
    ? DistributiveOmit<NonNullable<I>, 'fetchOptions'>
    : never;

export type InferClientOutput<T> = T extends (...args: infer _A) => Promise<infer O>
    ? O
    : never;

export class ClientError extends Error {
    status: number | undefined;
    statusText: string | undefined;

    constructor(message: string, statusText?: string, status?: number) {
        super(message);
        this.statusText = statusText;
        this.status = status;
    }
}

const isFileLike = (value: ClientPayloadEntry): value is Blob =>
    typeof Blob !== "undefined" && value instanceof Blob;

const payloadHasFiles = (payload: ClientPayload): boolean =>
    Object.values(payload).some(
        (value) =>
            isFileLike(value) || (Array.isArray(value) && value.some(isFileLike))
    );

const toFormData = (payload: ClientPayload): FormData => {
    const formData = new FormData();

    for (const [key, value] of Object.entries(payload)) {
        if (value === undefined || value === null) {
            continue;
        }

        const append = (item: JsonValue | Blob) => {
            if (isFileLike(item)) {
                formData.append(key, item);
            } else if (typeof item === "object") {
                formData.append(key, JSON.stringify(item));
            } else {
                formData.append(key, String(item));
            }
        };

        if (Array.isArray(value)) {
            value.forEach(append);
        } else {
            append(value);
        }
    }

    return formData;
};

/**
 * `createRecursiveProxy` returns a runtime `Proxy` — its dynamically dispatched
 * shape can never be verified structurally against an arbitrary generated
 * `Routes` type by the type checker, no matter how the route tree is shaped.
 * `TRoutes` is inferred from the call site's contextual type (e.g.
 * `const sdk: InferClient<Routes> = createClient({...})`), and the one
 * assertion below is the sole place that bridges the proxy's real runtime
 * shape to that inferred type.
 */
export function createClient<TRoutes>(options: ClientOptions): InferClient<TRoutes> {
    const { baseUrl, fetchOptions: defaultFetchOptions } = options;

    const proxy = createRecursiveProxy((path, args) => {
        const action = path.pop() as ActionType;
        const input: ClientRequestInput = (args[0] ?? {}) as ClientRequestInput;

        const method =
            action === "query" ? "GET" : action === "mutate" ? "POST" : action === "delete" ? "DELETE" : null;

        if (!method) {
            throw new Error(`Action '${action}' is not a valid action.`);
        }

        const { fetchOptions: inputFetchOptions, ...rest } = input;

        const urlParts = path.map((segment) => {
            if (segment.startsWith("$")) {
                const value = rest[segment];
                delete rest[segment];
                return String(value);
            }
            return kebabCase(segment);
        });

        const urlPath = "/" + urlParts.join("/");

        const base = new URL(baseUrl);
        const fullPath = `${base.pathname.replace(/\/$/, "")}/${urlPath.replace(/^\//, "")}`;
        const url = new URL(fullPath, base.origin);

        const hasExplicitFormData = inputFetchOptions?.body instanceof FormData;
        const hasFilePayload = method !== "GET" && payloadHasFiles(rest);
        const isMultipart = hasExplicitFormData || hasFilePayload;

        let body: string | FormData | undefined;

        if (hasExplicitFormData) {
            body = inputFetchOptions!.body as FormData;
        } else if (hasFilePayload) {
            body = toFormData(rest);
        } else if (method === "GET" && Object.keys(rest).length > 0) {
            url.search = qs.stringify(rest, { skipNulls: true });
        } else if (method !== "GET" && Object.keys(rest).length > 0) {
            body = JSON.stringify(rest);
        }

        const defaultHeaders: Record<string, string> = {
            Accept: "application/json",
        };

        if (!isMultipart) {
            defaultHeaders["Content-Type"] = "application/json";
        }

        const resolvedDefaultHeaders =
            typeof defaultFetchOptions?.headers === "function"
                ? defaultFetchOptions.headers()
                : defaultFetchOptions?.headers;

        const headers = new Headers({
            ...defaultHeaders,
            ...resolvedDefaultHeaders,
            ...inputFetchOptions?.headers,
        });

        return fetch(url, {
            ...defaultFetchOptions,
            ...inputFetchOptions,
            method,
            body,
            headers,
        }).then(async (response) => {
            if (response.status >= 300) {
                const jsonError = (await response.json().catch(() => ({}))) as {
                    message?: string;
                };
                throw new ClientError(
                    jsonError.message ?? response.statusText,
                    response.statusText,
                    response.status
                );
            }

            const isJsonRequest = headers.get("accept")?.includes("application/json");
            return isJsonRequest ? await response.json() : response;
        });
    })

    // @ts-expect-error — RecursiveProxy is a runtime Proxy; its dynamically
    // dispatched shape can never be structurally verified against an
    // arbitrary generated Routes type by the type checker. This is the sole,
    // deliberate bridge between the proxy's real runtime shape and the
    // inferred TRoutes contract (see the function doc comment above).
    return proxy
}
