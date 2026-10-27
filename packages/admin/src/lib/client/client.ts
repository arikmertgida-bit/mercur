import { createClient, InferClient } from '@mercurjs/client'
import { Routes } from '@mercurjs/core/_generated'
import { JsonValue } from '@mercurjs/types'
import { z } from 'zod'
import config from 'virtual:mercur/config'

import { assetUrl } from '../../utils/asset-url'
import { i18n } from '../../components/utilities/i18n'
import { clearAuthToken, getAuthHeaders } from './auth-token'

export const backendUrl = config.backendUrl ?? 'http://localhost:9000'

export const sdk: InferClient<Routes> = createClient<Routes>({
  baseUrl: backendUrl,
  fetchOptions: {
    credentials: 'omit',
    // A thunk (not a plain object) so every request picks up whatever
    // language is active in the panel right now — the admin can switch
    // languages mid-session without a page reload, and the backend's
    // error translation (see apps/api/src/lib/admin-error-i18n) keys off
    // this header on every call.
    headers: () => ({ 'Accept-Language': i18n.language }),
  },
  headers: getAuthHeaders,
})

/**
 * A JSON request body; `undefined` members are allowed because
 * `JSON.stringify` drops them, as optional form fields rely on.
 */
type FetchQueryBody =
  | JsonValue
  | FetchQueryBody[]
  | { [key: string]: FetchQueryBody | undefined }

// Error bodies come off the wire; only the message is read from them.
const FetchErrorBodySchema = z.object({ message: z.string().optional() })

/** A non-2xx response from `fetchQuery`, carrying the HTTP status. */
export class FetchQueryError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export const fetchQuery = async (
  url: string,
  {
    method,
    body,
    query,
    headers,
  }: {
    method: 'GET' | 'POST' | 'DELETE'
    body?: FetchQueryBody
    query?: Record<string, JsonValue | undefined>
    headers?: { [key: string]: string }
  }
) => {
  const params = Object.entries(query || {}).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        const arrayParams = value
          .map(
            (item) =>
              `${encodeURIComponent(key)}[]=${encodeURIComponent(String(item))}`
          )
          .join('&')
        if (acc) {
          acc += '&' + arrayParams
        } else {
          acc = arrayParams
        }
      } else {
        const separator = acc ? '&' : ''
        const serializedValue =
          typeof value === 'object' ? JSON.stringify(value) : value
        acc += `${separator}${encodeURIComponent(key)}=${encodeURIComponent(serializedValue)}`
      }
    }
    return acc
  }, '')

  const response = await fetch(
    `${backendUrl}${url}${params ? `?${params}` : ''}`,
    {
      method,
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': i18n.language,
        ...getAuthHeaders(),
        ...headers,
      },
      body: body ? JSON.stringify(body) : null,
    }
  )

  if (!response.ok) {
    const errorData = await response.json()

    if (response.status === 401) {
      clearAuthToken()
      window.location.href = `${assetUrl('/login')}?reason=Unauthorized`
      return
    }

    const parsedError = FetchErrorBodySchema.safeParse(errorData)
    throw new FetchQueryError(
      (parsedError.success && parsedError.data.message) || 'Server error',
      response.status
    )
  }

  return response.json()
}
