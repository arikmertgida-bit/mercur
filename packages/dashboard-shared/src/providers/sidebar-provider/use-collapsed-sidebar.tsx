import { useEffect, useLayoutEffect, useRef } from "react"

import { useSidebar } from "./use-sidebar"

const useDesktopSidebarOverride = (desktop: boolean, enabled: boolean) => {
  const { desktop: current, setDesktop } = useSidebar()

  // Layout effects run before the effect below, so it reads the state the
  // user had right before the override was applied.
  const desktopRef = useRef(current)
  useLayoutEffect(() => {
    desktopRef.current = current
  })

  useEffect(() => {
    if (!enabled) {
      return
    }

    const previous = desktopRef.current
    setDesktop(desktop)

    return () => setDesktop(previous)
  }, [desktop, enabled, setDesktop])
}

/**
 * Collapses the desktop sidebar to its icon rail for as long as the calling
 * component is mounted, restoring whatever the user had open before. Intended
 * for dense, full-height surfaces — the inbox, the editor — that need the
 * horizontal space but should not permanently change the user's preference.
 */
export const useCollapsedSidebar = (collapsed = true) => {
  useDesktopSidebarOverride(false, collapsed)
}

/**
 * Opens the desktop sidebar on mount and restores the previous state on
 * unmount. For sidebars without an icon rail, where arriving collapsed would
 * leave nothing to navigate with.
 */
export const useExpandedSidebar = (expanded = true) => {
  useDesktopSidebarOverride(true, expanded)
}
