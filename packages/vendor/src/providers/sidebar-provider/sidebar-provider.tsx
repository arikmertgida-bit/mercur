import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import { SidebarContext } from "./sidebar-context"

export const SidebarProvider = ({ children }: PropsWithChildren) => {
  const [desktop, setDesktop] = useState(true)
  const [mobile, setMobile] = useState(false)

  const { pathname } = useLocation()

  const toggle = useCallback((view: "desktop" | "mobile") => {
    if (view === "desktop") {
      setDesktop((prev) => !prev)
    } else {
      setMobile((prev) => !prev)
    }
  }, [])

  const closeMobile = useCallback(() => {
    setMobile(false)
  }, [])

  // close the mobile sidebar on route change
  // this is to prevent the sidebar from staying open
  // when navigating to a new page
  useEffect(() => {
    setMobile(false)
  }, [pathname])

  const value = useMemo(
    () => ({ desktop, mobile, toggle, closeMobile }),
    [desktop, mobile, toggle, closeMobile],
  )

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  )
}
