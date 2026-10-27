import {
  PropsWithoutRef,
  ReactNode,
  Ref,
  RefAttributes,
  forwardRef,
} from "react"

// Returns a plain call signature (not `ForwardRefExoticComponent`) on
// purpose: TypeScript only propagates a generic render function's own type
// parameters (e.g. Combobox's `<T extends Value>`) through a higher-order
// call when the result is a pure function type. With the exotic-component
// interface as the return type, `genericForwardRef(ComboboxImpl)` collapsed
// to `IntrinsicAttributes & RefAttributes<unknown>` and rejected every prop.
// The exotic component `forwardRef` returns is itself a valid value of that
// call signature. `render` takes `PropsWithoutRef<P>` — exactly what React
// 18's `forwardRef` hands it — so the two line up for an unresolved `P`.
export function genericForwardRef<T, P>(
  render: (props: PropsWithoutRef<P>, ref: Ref<T>) => ReactNode
): (props: PropsWithoutRef<P> & RefAttributes<T>) => ReactNode {
  return forwardRef<T, P>(render)
}
