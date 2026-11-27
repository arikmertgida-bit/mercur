import React from "react"

/** Input types whose Enter activates the control itself instead of submitting the form. */
const BUTTON_INPUT_TYPES = new Set(["button", "submit", "reset", "image"])

/**
 * True when Enter on `target` would make the browser submit the form
 * implicitly (single-line inputs, checkboxes, radios). Buttons, links and
 * textareas keep their own Enter behaviour.
 */
export function isImplicitSubmissionTarget(target: EventTarget): boolean {
  return (
    target instanceof HTMLInputElement && !BUTTON_INPUT_TYPES.has(target.type)
  )
}

/**
 * A form that can only be submitted with the keyboard when using the meta or
 * control key: plain Enter in an input does not submit it.
 */
export const KeyboundForm = React.forwardRef<
  HTMLFormElement,
  React.FormHTMLAttributes<HTMLFormElement>
>(({ onSubmit, onKeyDown, ...rest }, ref) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit?.(event)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") {
      return
    }

    if (event.metaKey || event.ctrlKey) {
      event.preventDefault()
      handleSubmit(event)
      return
    }

    if (isImplicitSubmissionTarget(event.target)) {
      event.preventDefault()
    }
  }

  return (
    // The form only filters key events bubbling up from its fields; it is not
    // a control itself. An unnamed form has no role in the accessibility tree,
    // so "presentation" changes nothing for assistive technology.
    <form
      role="presentation"
      {...rest}
      onSubmit={handleSubmit}
      onKeyDown={onKeyDown ?? handleKeyDown}
      ref={ref}
    />
  )
})

KeyboundForm.displayName = "KeyboundForm"
