import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react"
import { Search } from "../../components/search"
import { useSidebar } from "../sidebar-provider"
import { SearchContext } from "./search-context"

export const SearchProvider = ({ children }: PropsWithChildren) => {
  const [open, setOpen] = useState(false)
  const { mobile, toggle } = useSidebar()

  const toggleSearch = useCallback(() => {
    setOpen((prev) => {
      const update = !prev

      /**
       * If the mobile sidebar is open, then make sure
       * to close it when opening the search
       */
      if (update && mobile) {
        toggle("mobile")
      }

      return update
    })
  }, [mobile, toggle])

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

  const value = useMemo(
    () => ({
      open,
      onOpenChange: setOpen,
      toggleSearch,
    }),
    [open, toggleSearch],
  )

  return (
    <SearchContext.Provider value={value}>
      {children}
      <Search />
    </SearchContext.Provider>
  )
}
