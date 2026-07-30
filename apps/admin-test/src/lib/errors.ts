export function getCatchMessage(
  err: Error | string | null | undefined
): string {
  if (err instanceof Error) {
    return err.message
  }
  if (typeof err === "string") {
    return err
  }
  return "An unexpected error occurred."
}
