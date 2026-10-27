import { ClientError } from "@mercurjs/client"

// Takes what the data layer hands out: react-query errors and, through
// `instanceof` narrowing at the call site, router errors.
type CaughtError = Error | null | undefined

export const isClientError = (error: CaughtError): error is ClientError => {
  return error instanceof ClientError
}

export const isFetchError = (
  error: CaughtError
): error is Error & { status: number } => {
  return error instanceof Error && "status" in error
}
