import { Fragment, type ReactNode } from "react"
import type { JsonRecord } from "@mercurjs/types"
import { useExtension } from "./context"

export type WidgetZoneProps<TData = JsonRecord> = {
  /** Stable slot id, e.g. `product.list` or `product.detail`. Placement suffixes
   * (`before | after | replace`) are matched against it at render time. */
  id: string
  /** Optional data passed to each widget component (e.g. the detail entity). */
  data?: TData
  /** The built-in content, rendered between `before` and `after` widgets. */
  children?: ReactNode
}

/**
 * Injection-zone host. Renders `before` widgets → the built-in child →
 * `after` widgets. A zone that no page renders as a host can never be targeted.
 *
 * `data` is generic because hosts pass concrete entity DTOs (e.g. `AdminCollection`)
 * that don't carry an index signature, while registered widgets are declared
 * against the erased `JsonRecord` shape. Spreading into a fresh object literal
 * before forwarding lets TypeScript's implicit index-signature inference bridge
 * the two without a type assertion.
 */
export const WidgetZone = <TData = JsonRecord,>({
  id,
  data,
  children,
}: WidgetZoneProps<TData>) => {
  const { before, after } = useExtension().getWidgets(id)
  const widgetData = data && { ...data }

  return (
    <Fragment>
      {before.map(({ Component, widgetId }) => (
        <Component key={`before-${widgetId}`} data={widgetData} />
      ))}
      {children}
      {after.map(({ Component, widgetId }) => (
        <Component key={`after-${widgetId}`} data={widgetData} />
      ))}
    </Fragment>
  )
}
