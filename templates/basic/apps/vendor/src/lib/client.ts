import { createClient, type InferClient } from "@mercurjs/client"
import { getAuthHeaders } from "@mercurjs/vendor"
import type { Routes } from '@acme/api/_generated'

declare const __BACKEND_URL__: string

export const client: InferClient<Routes> = createClient<Routes>({
    baseUrl: __BACKEND_URL__,
    fetchOptions: {
        credentials: 'omit',
    },
    headers: getAuthHeaders,
})
