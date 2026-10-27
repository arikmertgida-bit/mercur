import { ComponentType } from "react"
import { LoaderFunction, RouteObject } from "react-router-dom"
import type { Permission, RouteHandle } from "@mercurjs/dashboard-sdk"
import { z } from "zod"
import { ErrorBoundary } from "../components/utilities/error-boundary"

export type Route = {
    Component: ComponentType
    path: string
    loader?: LoaderFunction
    handle?: RouteHandle
    isPublic?: boolean
    children?: Route[]
}

export type MenuItem = {
    label: string
    icon?: string
    path: string
    rank?: number
    nested?: string
    group?: string
    translationNs?: string
    permissions?: Permission[]
    requireAll?: boolean
}

/**
 * Creates a route object for a branch node in the route tree
 * @param segment - The path segment for this branch
 */
const createBranchRoute = (segment: string): RouteObject => ({
    path: segment,
    children: [],
})

/**
 * Moves a segment index page's breadcrumb onto its branch so it keeps matching
 * on every route below. Moved rather than copied, otherwise the list page would
 * show the domain crumb twice.
 */
// React Router types route handles loosely; a branch already carries a crumb
// when its handle has a `breadcrumb` renderer.
const BreadcrumbHandleSchema = z.object({
    breadcrumb: z.custom<NonNullable<RouteHandle["breadcrumb"]>>(
        (value) => typeof value === "function"
    ),
})

const hoistBreadcrumb = (
    branch: RouteObject,
    handle: RouteHandle | undefined,
    isIndex: boolean
): RouteHandle | undefined => {
    const branchHasBreadcrumb = BreadcrumbHandleSchema.safeParse(
        branch.handle
    ).success

    if (!isIndex || !handle?.breadcrumb || branchHasBreadcrumb) {
        return handle
    }

    branch.handle = { ...branch.handle, breadcrumb: handle.breadcrumb }

    const { breadcrumb: _breadcrumb, ...rest } = handle
    return Object.keys(rest).length ? rest : undefined
}

/**
 * Creates a route object for a leaf node with its component.
 * @param Component - The React component to render at this route
 * @param withErrorBoundary - False for a route that will be spread directly
 *   onto an existing base route object (the root-path case in `addRoute`) —
 *   that base object already carries its own `errorElement`, and having
 *   both `errorElement` and `ErrorBoundary` on the same route object is a
 *   react-router warning (`ErrorBoundary` silently wins, so the pair is
 *   never actually a bug, just noise — omitting it here is the correct fix
 *   rather than suppressing the warning). Every other call site nests its
 *   leaf a level below the base route that owns `errorElement`, so it never
 *   collides and keeps its own.
 */
const createLeafRoute = (
    Component: ComponentType,
    loader?: LoaderFunction,
    handle?: RouteHandle,
    path: string = "",
    withErrorBoundary: boolean = true
): RouteObject => ({
    path,
    ...(withErrorBoundary ? { ErrorBoundary } : {}),
    async lazy() {
        const result: {
            Component: ComponentType
            loader?: LoaderFunction
            handle?: RouteHandle
        } = { Component }

        if (loader) {
            result.loader = loader
        }

        if (handle) {
            result.handle = handle
        }

        return result
    },
})

/**
 * Creates a parallel route configuration
 * @param path - The route path
 * @param Component - The React component to render
 */
const createParallelRoute = (
    path: string,
    Component: ComponentType,
    loader?: LoaderFunction,
    handle?: RouteHandle
) => ({
    path,
    async lazy() {
        const result: {
            Component: ComponentType
            loader?: LoaderFunction
            handle?: RouteHandle
        } = { Component }

        if (loader) {
            result.loader = loader
        }

        if (handle) {
            result.handle = handle
        }

        return result
    },
})

/**
 * Processes parallel routes by cleaning their paths relative to the current path
 * @param parallelRoutes - Array of parallel route extensions
 * @param currentFullPath - The full path of the current route
 */
const processParallelRoutes = (
    parallelRoutes: Route[] | undefined,
    currentFullPath: string
): RouteObject[] | undefined => {
    return parallelRoutes
        ?.map(({ path, Component, loader, handle }) => {
            const childPath = path?.replace(currentFullPath, "").replace(/^\/+/, "")
            if (!childPath) {
                return null
            }
            return createParallelRoute(childPath, Component, loader, handle)
        })
        .filter((route) => route !== null)
}

/**
 * Recursively builds the route tree by adding routes at the correct level
 * @param pathSegments - Array of remaining path segments to process
 * @param Component - The React component for the route
 * @param currentLevel - Current level in the route tree
 * @param parallelRoutes - Optional parallel routes to add
 * @param fullPath - The full path up to the current level
 */
const addRoute = (
    pathSegments: string[],
    Component: ComponentType,
    currentLevel: RouteObject[],
    loader?: LoaderFunction,
    handle?: RouteHandle,
    parallelRoutes?: Route[],
    fullPath?: string,
    componentPath?: string
) => {
    if (!pathSegments.length) {
        /**
         * A custom route registered at the literal root path ("/") has no
         * path segments to walk (`"/".split("/").filter(Boolean)` is `[]`),
         * so without this branch it was silently dropped instead of ever
         * reaching `mergeRoutes` — the app's own root-overriding custom page
         * (e.g. a Dashboard home) never mounted, and the base "/" route
         * (a redirect stub) kept winning. `mergeRoutes` matches by path with
         * leading slashes stripped, so this must land as `path: ""` to match
         * the base list's `"/"` entry.
         */
        const rootLeaf = createLeafRoute(Component, loader, handle, "", false)
        rootLeaf.children = processParallelRoutes(parallelRoutes, fullPath ?? "")
        currentLevel.push(rootLeaf)
        return
    }

    const [currentSegment, ...remainingSegments] = pathSegments
    let route = currentLevel.find((r) => r.path === currentSegment)

    if (!route) {
        route = createBranchRoute(currentSegment)
        currentLevel.push(route)
    }

    const currentFullPath = fullPath
        ? `${fullPath}/${currentSegment}`
        : currentSegment

    const isComponentSegment = currentFullPath === componentPath

    if (isComponentSegment || remainingSegments.length === 0) {
        route.children ||= []

        if (loader) {
            route.loader = loader
        }

        // Since splat segments must occur at the end of a route, react-router enforces the segment to be a leaf.
        // Therefore we can't create a child leaf route with `path: ""` and must instead modify the route itself
        if (currentSegment === "*?" || currentSegment === "*") {
            const leaf = createLeafRoute(Component, loader, handle, currentSegment)
            leaf.children = processParallelRoutes(parallelRoutes, currentFullPath)
            Object.assign(route, leaf)
        } else {
            // Permission keys stay on the leaf: branches are shared between sibling
            // routes, so hoisting them would gate every route below on the index
            // page's rules. `breadcrumb` is the exception, mirroring the hand-written
            // settings tree in get-route-map.tsx.
            const leafHandle = hoistBreadcrumb(route, handle, remainingSegments.length === 0)
            const leaf = createLeafRoute(Component, loader, leafHandle)
            leaf.children = processParallelRoutes(parallelRoutes, currentFullPath)
            route.children.push(leaf)
        }
        if (remainingSegments.length > 0) {
            addRoute(
                remainingSegments,
                Component,
                route.children,
                undefined,
                undefined,
                undefined,
                currentFullPath
            )
        }
    } else {
        route.children ||= []
        addRoute(
            remainingSegments,
            Component,
            route.children,
            loader,
            handle,
            parallelRoutes,
            currentFullPath,
            componentPath
        )
    }
}

/**
 * Creates a complete route map from route extensions
 * @param routes - Array of route extensions to process
 * @param ignore - Optional path prefix to ignore when processing routes
 * @returns An array of route objects forming a route tree
 */
export const createRouteMap = (
    routes: Route[],
    ignore?: string
): RouteObject[] => {
    const root: RouteObject[] = []

    routes.forEach(({ path, Component, loader, handle, children }) => {
        const cleanedPath = ignore
            ? path.replace(ignore, "").replace(/^\/+/, "")
            : path.replace(/^\/+/, "")
        const pathSegments = cleanedPath.split("/").filter(Boolean)
        addRoute(
            pathSegments,
            Component,
            root,
            loader,
            handle,
            children,
            undefined,
            path
        )
    })

    return root
}

const settingsRouteRegex = /^\/settings\//

export const getRoutesByType = (routes: Route[], type: "settings" | "main" | "public") => {
    return routes.filter((route) => {
        if (type === "public") {
            return route.isPublic === true
        }
        if (type === "settings") {
            return !route.isPublic && settingsRouteRegex.test(route.path)
        }
        return !route.isPublic && !settingsRouteRegex.test(route.path)
    })
}

export const getMenuItemsByType = (
    menuItems: MenuItem[],
    type: "settings" | "main"
) => {
    return menuItems.filter((item) => {
        if (item.nested) {
            return false
        }

        if (type === "settings") {
            return settingsRouteRegex.test(item.path)
        }

        return !settingsRouteRegex.test(item.path)
    })
}

type MenuItemPermissionCheck = {
    hasAnyPermission: (permissions: Permission[]) => boolean
    hasAllPermissions: (permissions: Permission[]) => boolean
}

/**
 * Drops navigation entries the actor can't reach. Route access itself is
 * enforced by `RoutePermissionGuard` via `handle.permissions`; this only
 * controls visibility.
 */
export const filterMenuItemsByPermissions = <T extends MenuItem>(
    menuItems: T[],
    { hasAnyPermission, hasAllPermissions }: MenuItemPermissionCheck
): T[] => {
    return menuItems.filter((item) => {
        if (!item.permissions?.length) {
            return true
        }

        return item.requireAll
            ? hasAllPermissions(item.permissions)
            : hasAnyPermission(item.permissions)
    })
}

export const getNestedMenuItems = (
    menuItems: MenuItem[],
    parentPath: string
) => {
    return menuItems
        .filter((item) => item.nested === parentPath)
        .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
}
