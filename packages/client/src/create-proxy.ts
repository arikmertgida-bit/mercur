/**
 * The function a `createRecursiveProxy` call returns. Every property read on
 * it yields another one (one path segment deeper); calling it hands the path
 * and arguments to the callback. Only the call signature is visible to the
 * type checker — `createClient` bridges it to the inferred route contract.
 */
export type ProxyFunction<TInput, TResult> = (input?: TInput) => TResult

export type ProxyCallback<TInput, TResult> = (
    path: string[],
    args: [TInput?]
) => TResult

export function createRecursiveProxy<TInput, TResult>(
    callback: ProxyCallback<TInput, TResult>,
    path: string[] = []
): ProxyFunction<TInput, TResult> {
    const proxyTarget: ProxyFunction<TInput, TResult> = () => {
        throw new Error("createRecursiveProxy: the proxy target is never invoked directly")
    }

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
        apply(_, __, [input]) {
            return callback(path, [input]);
        },
    });
}
