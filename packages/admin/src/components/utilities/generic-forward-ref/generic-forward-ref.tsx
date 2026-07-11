import { ReactNode, Ref, RefAttributes, forwardRef } from "react"

export function genericForwardRef<T, P = {}>(
  render: (props: P, ref: Ref<T>) => ReactNode
): (props: P & RefAttributes<T>) => ReactNode {
  // React's forwardRef signature can't express an unconstrained generic P
  // (PropsWithoutRef<P> vs P is an unresolvable variance case) — see
  // microsoft/TypeScript#30650. This is a type-system boundary, not a typing bug here.
  // @ts-expect-error
  return forwardRef(render)
}
