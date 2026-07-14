import type { Permission } from "@mercurjs/dashboard-sdk"
import { usePermissionGate } from "@mercurjs/dashboard-shared"
import { cloneElement, type ReactElement } from "react"
import { ExclamationCircle, MagnifyingGlass, PlusMini } from "@medusajs/icons"
import { Button, Text, clx, Tooltip } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

export type NoResultsProps = {
  title?: string
  message?: string
  className?: string
}

export const NoResults = ({ title, message, className }: NoResultsProps) => {
  const { t } = useTranslation()

  return (
    <div
      className={clx(
        "flex h-[400px] w-full items-center justify-center",
        className
      )}
    >
      <div className="flex flex-col items-center gap-y-2">
        <MagnifyingGlass />
        <Text size="small" leading="compact" weight="plus">
          {title ?? t("general.noResultsTitle")}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          {message ?? t("general.noResultsMessage")}
        </Text>
      </div>
    </div>
  )
}

type ActionProps = {
  action?:
    | {
        to: string
        label: string
        /** Permission of what the target route does; disabled without it. */
        permission?: Permission | Permission[]
      }
    | { onClick: () => void; label: string }
}

export type NoRecordsProps = {
  title?: string
  message?: string
  className?: string
  buttonVariant?: string
  icon?: React.ReactNode
} & ActionProps

const ActionLink = ({
  action,
  children,
}: {
  action: { to: string; permission?: Permission | Permission[] }
  children: ReactElement<{ disabled?: boolean }>
}) => {
  const gate = usePermissionGate(action.permission)

  if (gate.denied) {
    return (
      <Tooltip content={gate.tooltip}>
        <span className="inline-flex">
          {cloneElement(children, { disabled: true })}
        </span>
      </Tooltip>
    )
  }

  return <Link to={action.to}>{children}</Link>
}

const DEFAULT_NO_RECORDS_ICON = (
  <ExclamationCircle className="text-ui-fg-subtle" />
)

const DefaultButton = ({ action }: ActionProps) => {
  if (!action) {
    return null
  }

  if ("onClick" in action) {
    return (
      <Button
        variant="secondary"
        size="small"
        type="button"
        onClick={action.onClick}
      >
        {action.label}
      </Button>
    )
  }

  return (
    <ActionLink action={action}>
      <Button variant="secondary" size="small">
        {action.label}
      </Button>
    </ActionLink>
  )
}

const TransparentIconLeftButton = ({ action }: ActionProps) => {
  if (!action) {
    return null
  }

  if ("onClick" in action) {
    return (
      <Button
        variant="transparent"
        className="text-ui-fg-interactive"
        type="button"
        onClick={action.onClick}
      >
        <PlusMini /> {action.label}
      </Button>
    )
  }

  return (
    <ActionLink action={action}>
      <Button variant="transparent" className="text-ui-fg-interactive">
        <PlusMini /> {action.label}
      </Button>
    </ActionLink>
  )
}

export const NoRecords = ({
  title,
  message,
  action,
  className,
  buttonVariant = "default",
  icon = DEFAULT_NO_RECORDS_ICON,
}: NoRecordsProps) => {
  const { t } = useTranslation()

  return (
    <div
      className={clx(
        "flex min-h-[150px] w-full flex-col items-center justify-center gap-y-4",
        className
      )}
    >
      <div className="flex flex-col items-center gap-y-3">
        {icon}

        <div className="flex flex-col items-center gap-y-1">
          <Text size="small" leading="compact" weight="plus">
            {title ?? t("general.noRecordsTitle")}
          </Text>

          <Text size="small" className="text-ui-fg-muted">
            {message ?? t("general.noRecordsMessage")}
          </Text>
        </div>
      </div>

      {buttonVariant === "default" && <DefaultButton action={action} />}
      {buttonVariant === "transparentIconLeft" && (
        <TransparentIconLeftButton action={action} />
      )}
    </div>
  )
}
