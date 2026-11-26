import { PropsWithChildren, useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { Search } from "../../components/search"
import { useSidebar } from "../sidebar-provider"
import { SearchContext } from "./search-context"

export const SearchProvider = ({ children }: PropsWithChildren) => {
  const [open, setOpen] = useState(false)
  const { mobile, toggle } = useSidebar()
  const { pathname } = useLocation()
  const [syncedPathname, setSyncedPathname] = useState(pathname)

  if (syncedPathname !== pathname) {
    setSyncedPathname(pathname)
    setOpen(false)
  }

  const toggleSearch = () => {
    const update = !open

    /**
     * If the mobile sidebar is open, then make sure
     * to close it when opening the search
     */
    if (update && mobile) {
      toggle("mobile")
    }

    setOpen(update)
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  return (
    <SearchContext.Provider
      value={{
        open,
        onOpenChange: setOpen,
        toggleSearch,
      }}
    >
      {children}
      <Search />
    </SearchContext.Provider>
  )
}
