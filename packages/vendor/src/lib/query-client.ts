import { QueryClient } from "@tanstack/react-query"
import { ClientError } from "@mercurjs/client"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 90000,
      // A 4xx response (401 unauthenticated, 404, validation errors, ...) is
      // definitive — the backend already told us the request won't succeed,
      // so retrying it wastes a request and doubles the browser's own
      // "Failed to load resource" console log for the same failure. Only
      // retry once for everything else (network blips, 5xx).
      retry: (failureCount, error) => {
        const status = error instanceof ClientError ? error.status : undefined
        if (status !== undefined && status < 500) {
          return false
        }
        return failureCount < 1
      },
    },
  },
})
