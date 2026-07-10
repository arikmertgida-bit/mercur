import { z } from "zod"
import { getCatchMessage } from "./errors"
import { logger } from "./logger"
import type { JsonRecord } from "./json-record"

declare const __BACKEND_URL__: string

export class HttpFetchError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "HttpFetchError"
    this.status = status
  }
}

const DEFAULT_ERROR_MESSAGE = "Beklenmeyen bir sunucu hatası oluştu."

export const fetchQuery = async <T>(
  url: string,
  {
    method,
    body,
    query,
    headers,
  }: {
    method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH"
    body?: JsonRecord
    query?: Record<string, string | number | boolean | undefined | null>
    headers?: Record<string, string>
  }
): Promise<T> => {
  let params = ""
  if (query) {
    const filtered = Object.entries(query).filter(
      ([, v]) => v !== null && v !== undefined && v !== ""
    )
    if (filtered.length > 0) {
      params = new URLSearchParams(
        filtered.map(([k, v]) => [k, String(v)])
      ).toString()
    }
  }
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  }

  const response = await fetch(`${__BACKEND_URL__}${url}${params ? `?${params}` : ""}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  })

  if (!response.ok) {
    let message = DEFAULT_ERROR_MESSAGE
    const ErrorBodySchema = z.object({ message: z.string() }).passthrough()
    try {
      const parsed = ErrorBodySchema.safeParse(await response.json())
      if (parsed.success && parsed.data.message) message = parsed.data.message
    } catch (err) {
      logger.warn(
        `[fetchQuery] Could not parse error response: ${getCatchMessage(
          err instanceof Error ? err : typeof err === "string" ? err : null
        )}`
      )
    }
    throw new HttpFetchError(message, response.status)
  }

  const result: T = await response.json()
  return result
}
