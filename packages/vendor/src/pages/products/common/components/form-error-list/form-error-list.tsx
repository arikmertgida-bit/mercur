import { FieldError, FieldErrors } from "react-hook-form"

export type FormErrorEntry = {
  path: string[]
  message: string
}

export type FormErrorLine = {
  id: string
  label: string
  message: string
}

const MAX_VISIBLE_LINES = 6

/**
 * Flattens react-hook-form's nested error tree into one entry per message.
 * Array-level errors (`variants.root`) are reported on the array's own path.
 */
export const collectFormErrors = (
  errors: FieldErrors | FieldError,
  path: string[] = []
): FormErrorEntry[] => {
  if (typeof errors !== "object" || errors === null) {
    return []
  }

  if ("message" in errors && "type" in errors) {
    return typeof errors.message === "string" && errors.message
      ? [{ path, message: errors.message }]
      : []
  }

  return Object.entries(errors).flatMap(([key, value]) =>
    key === "ref"
      ? []
      : collectFormErrors(value, key === "root" ? path : [...path, key])
  )
}

type FormErrorListProps = {
  lines: FormErrorLine[]
  moreLabel: (count: number) => string
}

export const FormErrorList = ({ lines, moreLabel }: FormErrorListProps) => {
  const visible = lines.slice(0, MAX_VISIBLE_LINES)
  const hiddenCount = lines.length - visible.length

  return (
    <ul className="flex flex-col gap-y-1" data-testid="form-error-list">
      {visible.map((line) => (
        <li key={line.id} className="txt-compact-small">
          <span className="txt-compact-small-plus">{line.label}</span>
          {": "}
          {line.message}
        </li>
      ))}
      {hiddenCount > 0 && (
        <li className="txt-compact-small text-ui-fg-subtle">
          {moreLabel(hiddenCount)}
        </li>
      )}
    </ul>
  )
}
