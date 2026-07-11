import { ClientError } from "@mercurjs/client"

type CaughtError = Error | ClientError

export const isClientError = (error: CaughtError): error is ClientError => {
  return error instanceof ClientError
}

export const isFetchError = (
  error: CaughtError
): error is Error & { status: number } => {
  return error instanceof Error && "status" in error
}
