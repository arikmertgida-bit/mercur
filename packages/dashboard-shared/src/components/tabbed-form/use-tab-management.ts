import { ProgressStatus } from "@medusajs/ui"
import { useCallback, useMemo, useState } from "react"
import { FieldValues, UseFormReturn } from "react-hook-form"

import { TabDefinition } from "./types"

type TabState = Record<string, ProgressStatus>

const getTabState = <T extends FieldValues>(
  visibleTabs: TabDefinition<T>[],
  activeTabId: string,
  previous: TabState
): TabState => {
  const state: TabState = {}
  const activeIndex = visibleTabs.findIndex((t) => t.id === activeTabId)

  visibleTabs.forEach((t, i) => {
    if (i < activeIndex) {
      state[t.id] = "completed"
    } else if (i === activeIndex) {
      state[t.id] = "in-progress"
    } else {
      state[t.id] = previous[t.id] ?? "not-started"
    }
  })

  return state
}

export const useTabManagement = <T extends FieldValues>({
  tabs,
  form,
}: {
  tabs: TabDefinition<T>[]
  form: UseFormReturn<T>
}) => {
  const visibleTabs = useMemo(
    () => tabs.filter((t) => !t.isVisible || t.isVisible(form)),
    [tabs, form]
  )

  const [activeTabId, setActiveTabId] = useState<string>(
    visibleTabs[0]?.id ?? ""
  )

  const [tabState, setTabState] = useState<TabState>(() => {
    const state: TabState = {}
    visibleTabs.forEach((t, i) => {
      state[t.id] = i === 0 ? "in-progress" : "not-started"
    })
    return state
  })

  // Recomputed when the active tab or the visible tabs change; tabs after the
  // active one keep the status they had.
  const [synced, setSynced] = useState({ activeTabId, visibleTabs })

  if (synced.activeTabId !== activeTabId || synced.visibleTabs !== visibleTabs) {
    setSynced({ activeTabId, visibleTabs })
    setTabState(getTabState(visibleTabs, activeTabId, tabState))
  }

  const activeIndex = visibleTabs.findIndex((t) => t.id === activeTabId)
  const isLastTab = activeIndex === visibleTabs.length - 1

  const onNext = useCallback(async () => {
    const valid = await form.trigger()

    if (!valid) {
      return
    }

    if (activeIndex < visibleTabs.length - 1) {
      setActiveTabId(visibleTabs[activeIndex + 1].id)
    }
  }, [form, activeIndex, visibleTabs])

  const onTabChange = useCallback(
    async (tabId: string) => {
      const valid = await form.trigger()

      if (!valid) {
        return
      }

      setActiveTabId(tabId)
    },
    [form]
  )

  return {
    activeTabId,
    setActiveTabId,
    tabState,
    visibleTabs,
    isLastTab,
    onNext,
    onTabChange,
  }
}
