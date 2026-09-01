import i18next from "i18next"
import { createClient, type InferClient } from "@mercurjs/client"
import type { Routes } from '@acme/api/_generated'

declare const __BACKEND_URL__: string

export const client: InferClient<Routes> = createClient<Routes>({
    baseUrl: __BACKEND_URL__,
    fetchOptions: {
        credentials: 'include',
        // A thunk (not a plain object) so every request picks up whatever
        // language is active in the panel right now — the backend's error
        // translation (apps/api/src/lib/vendor-error-i18n) keys off this
        // header on every call. Mirrors packages/vendor/src/lib/client/client.ts;
        // this is a separate client instance for apps/vendor's own custom
        // routes (requests, reviews, messages, followers, product import/export).
        headers: () => ({ 'Accept-Language': i18next.language }),
    }
})
