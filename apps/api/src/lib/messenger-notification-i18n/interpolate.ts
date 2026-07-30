/**
 * Replaces `{key}` placeholders in a notification template. Mirrors the
 * `{field}`/`{id}`-style templating in `vendor-error-i18n/messages.ts` —
 * kept as plain string substitution (not a template-literal function per
 * language) so the 31 translated variants stay pure data.
 */
export function interpolateNotification(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.split(`{${key}}`).join(value),
    template
  )
}
