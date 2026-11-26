import { PropsWithChildren, useCallback, useMemo, useState } from "react"
import { StackedModalContext } from "./stacked-modal-context"

type StackedModalProviderProps = PropsWithChildren<{
  onOpenChange: (open: boolean) => void
}>

export const StackedModalProvider = ({
  children,
  onOpenChange,
}: StackedModalProviderProps) => {
  const [state, setState] = useState<Record<string, boolean>>({})

  const getIsOpen = useCallback(
    (id: string) => {
      return state[id] || false
    },
    [state],
  )

  const setIsOpen = useCallback(
    (id: string, open: boolean) => {
      setState((prevState) => ({
        ...prevState,
        [id]: open,
      }))

      onOpenChange(open)
    },
    [onOpenChange],
  )

  const register = useCallback((id: string) => {
    setState((prevState) => ({
      ...prevState,
      [id]: false,
    }))
  }, [])

  const unregister = useCallback((id: string) => {
    setState((prevState) => {
      const newState = { ...prevState }
      delete newState[id]
      return newState
    })
  }, [])

  const value = useMemo(
    () => ({
      getIsOpen,
      setIsOpen,
      register,
      unregister,
    }),
    [getIsOpen, setIsOpen, register, unregister],
  )

  return (
    <StackedModalContext.Provider value={value}>
      {children}
    </StackedModalContext.Provider>
  )
}
