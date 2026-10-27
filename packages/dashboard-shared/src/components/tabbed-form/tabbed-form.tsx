import { Button, ProgressTabs } from "@medusajs/ui"
import {
  Children,
  createContext,
  isValidElement,
  ReactElement,
  ReactNode,
  useContext,
  useMemo,
} from "react"
import {
  FieldPath,
  FieldValues,
  useFormContext,
  UseFormReturn,
} from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { RouteFocusModal } from "@components/modals"
import { KeyboundForm } from "@components/utilities/keybound-form"

import { TabDefinition } from "./types"
import { useTabManagement } from "./use-tab-management"

/** Marks that a tab is rendered inside a `TabbedForm`. */
const TabbedFormContext = createContext(false)

/**
 * The wizard's form, read through react-hook-form's own context (the
 * `TabbedForm` renders its form inside a `FormProvider`).
 */
export const useTabbedForm = <
  T extends FieldValues = FieldValues,
>(): UseFormReturn<T> => {
  const isInTabbedForm = useContext(TabbedFormContext)
  const form = useFormContext<T>()

  if (!isInTabbedForm) {
    throw new Error("useTabbedForm must be used within a TabbedForm")
  }

  return form
}

/**
 * A tab's definition comes from its component's static `_tabMeta` and/or the
 * element's props; both are untyped at runtime, so they are validated here.
 */
const createTabMetaSchema = <T extends FieldValues>() =>
  z.object({
    id: z.string().optional(),
    labelKey: z.string().optional(),
    label: z.string().optional(),
    validationFields: z
      .array(z.custom<FieldPath<T>>((value) => typeof value === "string"))
      .optional(),
    isVisible: z
      .custom<NonNullable<TabDefinition<T>["isVisible"]>>(
        (value) => typeof value === "function"
      )
      .optional(),
  })

function resolveTabMeta<T extends FieldValues>(
  child: ReactElement
): TabDefinition<T> | null {
  const schema = createTabMetaSchema<T>()
  const { type } = child
  const parsedMeta = schema.safeParse(
    typeof type !== "string" && "_tabMeta" in type ? type._tabMeta : undefined
  )
  const parsedProps = schema.safeParse(child.props ?? {})
  const meta = parsedMeta.success ? parsedMeta.data : undefined
  const props = parsedProps.success ? parsedProps.data : {}

  if (!meta && !props.id) {
    return null
  }

  return {
    id: props.id ?? meta?.id ?? "",
    labelKey: meta?.labelKey ?? "",
    label: props.label,
    validationFields: props.validationFields ?? meta?.validationFields,
    isVisible: props.isVisible ?? meta?.isVisible,
  }
}

function collectTabs<T extends FieldValues>(children: ReactNode): {
  tabs: TabDefinition<T>[]
  elements: ReactElement[]
} {
  const tabs: TabDefinition<T>[] = []
  const elements: ReactElement[] = []

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return
    }

    const meta = resolveTabMeta<T>(child)
    if (meta) {
      tabs.push(meta)
      elements.push(child)
    }
  })

  return { tabs, elements }
}

type FooterRenderProps = {
  isLastTab: boolean
  onNext: () => void
  isLoading?: boolean
}

type TabbedFormProps<T extends FieldValues> = {
  form: UseFormReturn<T>
  onSubmit: (e?: React.BaseSyntheticEvent) => void
  children: ReactNode
  isLoading?: boolean
  footer?: (props: FooterRenderProps) => ReactNode
  transformTabs?: (tabs: TabDefinition<T>[]) => TabDefinition<T>[]
  // Anchors this wizard's tabs to a custom-fields registry model + zone. Read at
  // build time by generate-extension-targets to type `formTabs`; not used at runtime.
  model?: string
  zone?: string
}

function Root<T extends FieldValues>({
  form,
  onSubmit,
  children,
  isLoading,
  footer,
  transformTabs,
}: TabbedFormProps<T>) {
  const { t } = useTranslation()

  const { tabs: rawTabs, elements } = useMemo(
    () => collectTabs<T>(children),
    [children]
  )

  const tabs = useMemo(
    () => (transformTabs ? transformTabs(rawTabs) : rawTabs),
    [transformTabs, rawTabs]
  )

  const {
    activeTabId,
    tabState,
    visibleTabs,
    isLastTab,
    onNext,
    onTabChange,
  } = useTabManagement<T>({
    tabs,
    form,
  })

  const visibleElements = elements.flatMap((element) => {
    const meta = resolveTabMeta<T>(element)
    return meta && visibleTabs.some((vt) => vt.id === meta.id)
      ? [{ element, meta }]
      : []
  })

  return (
    <TabbedFormContext.Provider value={true}>
      <RouteFocusModal.Form form={form}>
        <KeyboundForm
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (
                e.target instanceof HTMLTextAreaElement &&
                !(e.metaKey || e.ctrlKey)
              ) {
                return
              }

              e.preventDefault()

              if (e.metaKey || e.ctrlKey) {
                if (!isLastTab) {
                  e.preventDefault()
                  e.stopPropagation()
                  onNext()

                  return
                }

                onSubmit()
              }
            }
          }}
          onSubmit={onSubmit}
          className="flex h-full flex-col"
        >
          <ProgressTabs
            value={activeTabId}
            onValueChange={onTabChange}
            className="flex h-full flex-col overflow-hidden"
          >
            <RouteFocusModal.Header>
              <div className="-my-2 w-full border-l">
                <ProgressTabs.List className="justify-start-start flex w-full items-center">
                  {visibleTabs.map((tab) => (
                    <ProgressTabs.Trigger
                      key={tab.id}
                      status={tabState[tab.id] ?? "not-started"}
                      value={tab.id}
                      className="max-w-[200px] truncate"
                    >
                      {tab.label ?? t(tab.labelKey)}
                    </ProgressTabs.Trigger>
                  ))}
                </ProgressTabs.List>
              </div>
            </RouteFocusModal.Header>
            <RouteFocusModal.Body className="size-full overflow-hidden">
              {visibleElements.map(({ element, meta }) => {
                return (
                  <ProgressTabs.Content
                    key={meta.id}
                    className="size-full overflow-y-auto"
                    value={meta.id}
                  >
                    {element}
                  </ProgressTabs.Content>
                )
              })}
            </RouteFocusModal.Body>
          </ProgressTabs>
          <RouteFocusModal.Footer>
            {footer ? (
              footer({ isLastTab, onNext, isLoading })
            ) : (
              <DefaultFooter
                isLastTab={isLastTab}
                onNext={onNext}
                isLoading={isLoading}
              />
            )}
          </RouteFocusModal.Footer>
        </KeyboundForm>
      </RouteFocusModal.Form>
    </TabbedFormContext.Provider>
  )
}

const DefaultFooter = ({
  isLastTab,
  onNext,
  isLoading,
}: FooterRenderProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-end gap-x-2">
      <RouteFocusModal.Close asChild>
        <Button variant="secondary" size="small">
          {t("actions.cancel")}
        </Button>
      </RouteFocusModal.Close>
      {isLastTab ? (
        <Button
          key="submit-button"
          type="submit"
          variant="primary"
          size="small"
          isLoading={isLoading}
        >
          {t("actions.save")}
        </Button>
      ) : (
        <Button
          key="next-button"
          type="button"
          variant="primary"
          size="small"
          onClick={() => onNext()}
        >
          {t("actions.continue")}
        </Button>
      )}
    </div>
  )
}

const Tab = ({
  children,
}: {
  id: string
  label: string
  children?: ReactNode
}) => {
  return (
    <div className="flex flex-col items-center p-16">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8">
        {children}
      </div>
    </div>
  )
}

export const TabbedForm = Object.assign(Root, { Tab, useForm: useTabbedForm })
