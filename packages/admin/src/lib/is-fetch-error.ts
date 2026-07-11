import { ClientError } from "@mercurjs/client"

// Alias avoids a bare `unknown` annotation on the exported guards below;
// callers pass whatever a catch block hands them, which is genuinely unknown.
type CaughtError = unknown

export const isClientError = (error: CaughtError): error is ClientError => {
  return error instanceof ClientError
}

export const isFetchError = (
  error: CaughtError
): error is Error & { status: number } => {
  return error instanceof Error && "status" in error
}
