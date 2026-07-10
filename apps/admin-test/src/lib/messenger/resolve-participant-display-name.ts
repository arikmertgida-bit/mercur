const RAW_USER_ID_PREFIXES = ["sel_", "mem_", "cus_", "usr_", "user_"] as const

function isRawUserId(value: string): boolean {
  return RAW_USER_ID_PREFIXES.some((prefix) => value.startsWith(prefix))
}

export function resolveParticipantDisplayName(
  displayName: string | null | undefined,
  fallback: string
): string {
  const trimmed = displayName?.trim() ?? ""
  if (trimmed.length > 0 && !isRawUserId(trimmed)) {
    return trimmed
  }
  return fallback
}
