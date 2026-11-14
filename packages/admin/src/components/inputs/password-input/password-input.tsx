import { Eye, EyeSlash } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { ComponentPropsWithoutRef, forwardRef, useState } from "react"
import { useTranslation } from "react-i18next"

/**
 * Password field with a translated show/hide toggle.
 *
 * `@medusajs/ui`'s `Input type="password"` renders its own toggle whose
 * screen-reader text is hardcoded English ("Show password"/"Hide password")
 * and cannot be overridden, so the panels use this field instead. The input
 * classes mirror `@medusajs/ui`'s `Input` (base size) so it looks identical;
 * the toggle uses logical sides (`end`/`border-s`) so it flips in RTL.
 */
export type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type">

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const { t } = useTranslation()
    const [visible, setVisible] = useState(false)

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={clx(
            "caret-ui-fg-base bg-ui-bg-field hover:bg-ui-bg-field-hover shadow-borders-base placeholder-ui-fg-muted text-ui-fg-base transition-fg relative w-full appearance-none rounded-md outline-none",
            "focus-visible:shadow-borders-interactive-with-active",
            "disabled:text-ui-fg-disabled disabled:!bg-ui-bg-disabled disabled:placeholder-ui-fg-disabled disabled:cursor-not-allowed",
            "aria-[invalid=true]:!shadow-borders-error invalid:!shadow-borders-error",
            "txt-compact-small h-8 px-2 py-1.5 pe-8",
            className
          )}
          {...props}
        />
        <div className="absolute bottom-0 end-0 flex h-8 w-8 items-center justify-center border-s">
          <button
            type="button"
            className="text-ui-fg-muted hover:text-ui-fg-base focus-visible:text-ui-fg-base focus-visible:shadow-borders-interactive-w-focus active:text-ui-fg-base h-fit w-fit rounded-sm outline-none transition-all"
            onClick={() => setVisible((current) => !current)}
          >
            <span className="sr-only">
              {visible ? t("a11y.hidePassword") : t("a11y.showPassword")}
            </span>
            {visible ? <EyeSlash /> : <Eye />}
          </button>
        </div>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"
