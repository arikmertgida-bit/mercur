import {
  ReactNode,
  Ref,
  RefAttributes,
  forwardRef,
  ForwardRefExoticComponent,
} from "react"

export function genericForwardRef<T, P = {}>(
  render: (props: P, ref: Ref<T>) => ReactNode
): ForwardRefExoticComponent<P & RefAttributes<T>> {
  return forwardRef(render) as ForwardRefExoticComponent<P & RefAttributes<T>>
}
