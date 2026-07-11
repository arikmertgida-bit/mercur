type JsonPrimitive = string | number | boolean | null
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]
type JsonValue = JsonPrimitive | JsonObject | JsonArray
type JsonRecord = Record<string, JsonValue>

type ProxyCallArgs = [JsonRecord?]

export type ProxyCallback<TResult = JsonValue | Promise<JsonValue> | Response> = (
    path: string[],
    args: ProxyCallArgs
) => TResult

export type RecursiveProxy = {
    [key: string]: RecursiveProxy
} & ((input?: JsonRecord) => ReturnType<ProxyCallback>)

export function createRecursiveProxy(
    callback: ProxyCallback,
    path: string[] = []
): RecursiveProxy {
    const proxyTarget = function () { } as RecursiveProxy

    return new Proxy(proxyTarget, {
        get(_, prop) {
            if (typeof prop !== "string") {
                return undefined;
            }

            if (prop === "then" || prop === "catch" || prop === "finally") {
                return undefined;
            }

            return createRecursiveProxy(callback, [...path, prop]);
        },
        apply(_, __, args) {
            return callback(path, args as ProxyCallArgs);
        },
    }) as RecursiveProxy;
}
