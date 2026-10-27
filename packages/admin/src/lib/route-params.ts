import { Params } from "react-router-dom"

/**
 * Loader counterpart of `useRequiredParam`: reads a path parameter the matched
 * route declares (e.g. `:id` in `/orders/:id`). A missing value means the
 * loader runs under the wrong route, which surfaces through the route's error
 * boundary instead of as a request for `/undefined`.
 */
export const getRequiredParam = (params: Params, name: string): string => {
  const value = params[name]

  if (!value) {
    throw new Error(`Route parameter "${name}" is missing`)
  }

  return value
}
