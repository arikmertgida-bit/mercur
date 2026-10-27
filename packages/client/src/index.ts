import qs from "qs";
import { createRecursiveProxy } from "./create-proxy";
import { ClientOptions } from "./types";
import type { FetchOptionsInput, InferClient, StripFetchOptions } from "./types";
export type { InferClient } from "./types";
import { kebabCase } from "./utils";

type JsonPrimitive = string | number | boolean | null
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]
type JsonValue = JsonPrimitive | JsonObject | JsonArray
type JsonRecord = Record<string, JsonValue>
type ClientPayloadEntry = JsonValue | Blob | (JsonValue | Blob)[]
type ClientPayload = Record<string, ClientPayloadEntry>
type ClientRequestInput = ClientPayload & FetchOptionsInput

export type InferClientInput<T> = T extends (input: infer I) => infer _R
    ? StripFetchOptions<I>
    : T extends (input?: infer I) => infer _R
    ? StripFetchOptions<NonNullable<I>>
    : never;

export type InferClientOutput<T> = T extends (...args: infer _A) => Promise<infer O>
    ? O
    : never;

export class ClientError extends Error {
    status: number | undefined;
    statusText: string | undefined;
    /**
     * The API's machine-readable error code (`MedusaError.code`), when the
     * error body carried one — e.g. `"insufficient_inventory"`. Lets a caller
     * branch on the reason for a refusal without matching on `message`.
     */
    code: string | undefined;

    constructor(message: string, statusText?: string, status?: number, code?: string) {
        super(message);
        this.statusText = statusText;
        this.status = status;
        this.code = code;
    }
}

const isFileLike = (value: ClientPayloadEntry): value is Blob =>
    typeof Blob !== "undefined" && value instanceof Blob;

const payloadHasFiles = (payload: ClientPayload): boolean =>
    Object.values(payload).some(
        (value) =>
            isFileLike(value) || (Array.isArray(value) && value.some(isFileLike))
    );

const readErrorBody = async (
    response: Response
): Promise<{ message?: string; code?: string }> => {
    let body: JsonValue = null;
    try {
        body = await response.json();
    } catch {
        return {};
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return {};
    }
    return {
        message: typeof body.message === "string" ? body.message : undefined,
        code: typeof body.code === "string" ? body.code : undefined,
    };
};

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
    const { baseUrl, fetchOptions: defaultFetchOptions, headers: resolveHeaders } = options;

    const proxy = createRecursiveProxy((path, args: [ClientRequestInput?]) => {
        const action = path.pop();
        const input: ClientRequestInput = args[0] ?? {};

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

        const explicitFormData =
            inputFetchOptions?.body instanceof FormData ? inputFetchOptions.body : undefined;
        const hasExplicitFormData = explicitFormData !== undefined;
        const hasFilePayload = method !== "GET" && payloadHasFiles(rest);
        const isMultipart = hasExplicitFormData || hasFilePayload;

        let body: string | FormData | undefined;

        if (explicitFormData) {
            body = explicitFormData;
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
            ...resolveHeaders?.(),
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
                const jsonError = await readErrorBody(response);
                throw new ClientError(
                    jsonError.message ?? response.statusText,
                    response.statusText,
                    response.status,
                    jsonError.code
                );
            }

            // Some framework-level endpoints (e.g. Medusa's core auth
            // reset-password route) reply `text/plain` ("Created") even
            // though every request here asks for `application/json` via
            // the `Accept` header above — the request header is a wish,
            // not a guarantee. Trust the response's own `Content-Type`
            // instead of our own request header, or `.json()` throws a
            // `SyntaxError` on the plain-text body.
            const isJsonResponse = response.headers
                .get("content-type")
                ?.includes("application/json");
            return isJsonResponse ? await response.json() : response;
        });
    })

    // @ts-expect-error — the recursive proxy is a runtime Proxy; its dynamically
    // dispatched shape can never be structurally verified against an
    // arbitrary generated Routes type by the type checker. This is the sole,
    // deliberate bridge between the proxy's real runtime shape and the
    // inferred TRoutes contract (see the function doc comment above).
    return proxy
}
