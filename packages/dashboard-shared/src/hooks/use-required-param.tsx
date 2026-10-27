import { useParams } from "react-router-dom"

/**
 * Reads a path parameter the matched route declares (e.g. `:id` in
 * `/orders/:id`). React Router types every param as optional; a page mounted
 * under such a route always receives it, so a missing value means the page was
 * mounted under the wrong route — that surfaces through the route's error
 * boundary instead of as a request for `/undefined`.
 */
export const useRequiredParam = (name: string): string => {
  const value = useParams()[name]

  if (!value) {
    throw new Error(`Route parameter "${name}" is missing`)
  }

  return value
}
