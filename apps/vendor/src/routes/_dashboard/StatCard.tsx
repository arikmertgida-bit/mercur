import { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Container, Heading, Text, clx } from "@medusajs/ui"

type StatCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  to?: string
  isLoading?: boolean
}

export const StatCard = ({ icon, label, value, to, isLoading }: StatCardProps) => {
  const content = (
    <Container
      className={clx(
        "flex items-center gap-x-4 p-5",
        to && "hover:bg-ui-bg-base-hover transition-fg cursor-pointer"
      )}
    >
      <div className="bg-ui-bg-component text-ui-fg-subtle flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
        {icon}
      </div>
      <div className="flex min-w-0 flex-col gap-y-0.5">
        <Text size="small" weight="plus" className="text-ui-fg-subtle truncate">
          {label}
        </Text>
        {isLoading ? (
          <div className="bg-ui-bg-component h-6 w-16 animate-pulse rounded" />
        ) : (
          <Heading level="h2">{value}</Heading>
        )}
      </div>
    </Container>
  )

  if (!to) {
    return content
  }

  return (
    <Link to={to} className="block">
      {content}
    </Link>
  )
}
