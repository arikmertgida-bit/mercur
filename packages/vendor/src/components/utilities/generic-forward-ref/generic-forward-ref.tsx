import { ReactNode, Ref, RefAttributes, forwardRef } from "react"

export function genericForwardRef<T, P = {}>(
  render: (props: P, ref: Ref<T>) => ReactNode
): (props: P & RefAttributes<T>) => ReactNode {
  // `forwardRef` erases the generic `P` in its return type; this helper's
  // whole purpose is to restore it for callers, so this cast back to the
  // function's own declared return type is the intended escape hatch.
  return forwardRef(render) as (props: P & RefAttributes<T>) => ReactNode
}
