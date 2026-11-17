import { ProgressStatus } from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  FieldError,
  FieldErrors,
  FieldPath,
  FieldValues,
  UseFormReturn,
} from "react-hook-form"
import { z } from "zod"

import { TabDefinition } from "./types"

type TabState = Record<string, ProgressStatus>

/**
 * Validates fields for a specific tab. If the tab declares `validationFields`,
 * only those fields are validated. Otherwise falls back to full form validation.
 */
const validateTab = async <T extends FieldValues>(
  form: UseFormReturn<T>,
  tab: TabDefinition<T>
): Promise<boolean> => {
  if (tab.validationFields?.length) {
    return form.trigger(tab.validationFields)
  }
  return form.trigger()
}

/**
 * Validates all tabs from `fromIndex` to `toIndex` (inclusive) sequentially.
 * Returns false on the first tab that fails validation.
 */
const validateTabRange = async <T extends FieldValues>(
  form: UseFormReturn<T>,
  tabs: TabDefinition<T>[],
  fromIndex: number,
  toIndex: number
): Promise<boolean> => {
  for (let i = fromIndex; i <= toIndex; i++) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- intentional short-circuit: stop at the first invalid tab instead of validating all tabs in parallel
    if (!(await validateTab(form, tabs[i]))) {
      return false
    }
  }
  return true
}

/**
 * Walks a (possibly nested) RHF error down to the first leaf that carries a
 * message, so focus lands on e.g. `attributes.2.values` rather than on the
 * `attributes` array as a whole.
 */
const findFirstErrorPath = (
  error: FieldErrors | FieldError | undefined,
  path: string
): string => {
  if (!error || typeof error !== "object" || "message" in error) {
    return path
  }

  for (const [key, nested] of Object.entries(error)) {
    if (nested && typeof nested === "object" && key !== "ref") {
      return findFirstErrorPath(nested, `${path}.${key}`)
    }
  }

  return path
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

  const { getFieldState, setFocus } = form

  const fieldPathSchema = useMemo(
    () => z.custom<FieldPath<T>>((value) => typeof value === "string"),
    []
  )

  // Set right before switching to the tab that holds the first error; the
  // field only mounts (and can take focus) once that tab has rendered.
  const pendingFocusRef = useRef<FieldPath<T> | null>(null)

  useEffect(() => {
    const name = pendingFocusRef.current
    if (!name) return

    pendingFocusRef.current = null
    setFocus(name)
  }, [activeTabId, setFocus])

  const [tabState, setTabState] = useState<TabState>(() => {
    const state: TabState = {}
    visibleTabs.forEach((t, i) => {
      state[t.id] = i === 0 ? "in-progress" : "not-started"
    })
    return state
  })

  useEffect(() => {
    let resolvedActiveId = activeTabId
    const activeExists = visibleTabs.some((t) => t.id === activeTabId)

    if (!activeExists && visibleTabs.length > 0) {
      resolvedActiveId = visibleTabs[0].id
      setActiveTabId(resolvedActiveId)
    }

    const newState: TabState = {}
    const resolvedIndex = visibleTabs.findIndex(
      (t) => t.id === resolvedActiveId
    )

    visibleTabs.forEach((t, i) => {
      if (i < resolvedIndex) {
        newState[t.id] = "completed"
      } else if (i === resolvedIndex) {
        newState[t.id] = "in-progress"
      } else {
        newState[t.id] = tabState[t.id] ?? "not-started"
      }
    })

    setTabState(newState)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we only want this effect to run when the active tab or visible tabs change
  }, [activeTabId, visibleTabs])

  const activeIndex = visibleTabs.findIndex((t) => t.id === activeTabId)
  const isLastTab = activeIndex === visibleTabs.length - 1

  const onNext = useCallback(async () => {
    const currentTab = visibleTabs[activeIndex]
    if (!currentTab) return

    const valid = await validateTab(form, currentTab)
    if (!valid) return

    if (activeIndex < visibleTabs.length - 1) {
      setActiveTabId(visibleTabs[activeIndex + 1].id)
    }
  }, [form, activeIndex, visibleTabs])

  const onTabChange = useCallback(
    async (tabId: string) => {
      const targetIndex = visibleTabs.findIndex((t) => t.id === tabId)
      if (targetIndex === -1) return

      const currentIndex = visibleTabs.findIndex((t) => t.id === activeTabId)

      if (currentIndex === -1) {
        setActiveTabId(tabId)
        return
      }

      if (targetIndex <= currentIndex) {
        setActiveTabId(tabId)
        return
      }

      const valid = await validateTabRange(
        form,
        visibleTabs,
        currentIndex,
        targetIndex - 1
      )
      if (!valid) return

      setActiveTabId(tabId)
    },
    [form, visibleTabs, activeTabId]
  )

  /**
   * After a failed submit: opens the first tab (in tab order) that holds an
   * invalid field and focuses that field. Tabs are matched through their
   * `validationFields`, the same list "Continue" validates.
   */
  const revealFirstError = useCallback(() => {
    for (const tab of visibleTabs) {
      const invalidField = tab.validationFields?.find(
        (field) => getFieldState(field).invalid
      )

      if (!invalidField) {
        continue
      }

      const parsed = fieldPathSchema.safeParse(
        findFirstErrorPath(
          getFieldState(invalidField).error,
          invalidField
        )
      )
      const name = parsed.success ? parsed.data : invalidField

      if (tab.id === activeTabId) {
        setFocus(name)
      } else {
        pendingFocusRef.current = name
        setActiveTabId(tab.id)
      }

      return
    }
  }, [visibleTabs, activeTabId, fieldPathSchema, getFieldState, setFocus])

  return {
    activeTabId,
    setActiveTabId,
    tabState,
    visibleTabs,
    isLastTab,
    onNext,
    onTabChange,
    revealFirstError,
  }
}
