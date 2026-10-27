import { useEffect, useRef } from "react"

import { Plus } from "@medusajs/icons"
import type { JsonValue } from "@mercurjs/types"
import { Controller, ControllerRenderProps } from "react-hook-form"
import { z } from "zod"

import { useCombinedRefs } from "../../../hooks/use-combined-refs"
import { Thumbnail } from "../../common/thumbnail"
import { useDataGridCell, useDataGridCellError } from "../hooks"
import {
  DataGridCellProps,
  DataGridFormValues,
  InputProps,
  MediaData,
} from "../types"
import { DataGridCellContainer } from "./data-grid-cell-container"

export type { MediaData }

/**
 * The grid exposes form values as JSON, but a media cell's form value is the
 * product form's media list, whose entries may still carry the selected
 * `File` before upload — so the value is validated against that shape.
 */
const MediaListSchema: z.ZodType<MediaData[]> = z.array(
  z.object({
    id: z.string().optional(),
    url: z.string(),
    isThumbnail: z.boolean(),
    file: z.instanceof(File).nullish(),
  })
)

const toMediaList = (value: JsonValue): MediaData[] => {
  const parsed = MediaListSchema.safeParse(value)

  return parsed.success ? parsed.data : []
}

export const DataGridMediaCell = <TData, TValue = JsonValue>({
  context,
  onOpenMediaModal,
  disabled,
  ...rest
}: DataGridCellProps<TData, TValue> & {
  onOpenMediaModal?: () => void
  disabled?: boolean
}) => {
  const { field, control, renderProps } = useDataGridCell({
    context,
  })
  const errorProps = useDataGridCellError({ context })

  const { container, input } = renderProps

  return (
    <Controller
      control={control}
      name={field}
      render={({ field }) => {
        return (
          <DataGridCellContainer
            {...container}
            {...errorProps}
            outerComponent={
              <OuterComponent
                isAnchor={container.isAnchor}
                onOpenMediaModal={onOpenMediaModal}
                disabled={disabled}
              />
            }
          >
            <Inner
              field={field}
              inputProps={input}
              disabled={disabled}
              {...rest}
            />
          </DataGridCellContainer>
        )
      }}
    />
  )
}

const OuterComponent = ({
  isAnchor,
  onOpenMediaModal,
  disabled,
}: {
  isAnchor: boolean
  onOpenMediaModal?: () => void
  disabled?: boolean
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        isAnchor &&
        e.key === "Enter" &&
        onOpenMediaModal &&
        !disabled
      ) {
        e.preventDefault()
        onOpenMediaModal()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isAnchor, onOpenMediaModal, disabled])

  return (
    <div className="absolute inset-y-0 right-4 z-[3] flex w-fit items-center justify-center opacity-0 transition-opacity group-hover/container:opacity-100">
      <button
        ref={buttonRef}
        type="button"
        onClick={onOpenMediaModal}
        className="txt-compact-small-plus flex items-center justify-center rounded-[4px] p-1 text-ui-fg-interactive outline-none transition-fg hover:text-ui-fg-interactive-hover focus-visible:shadow-borders-focus disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!onOpenMediaModal || disabled}
      >
        <Plus
          className={disabled ? "text-ui-fg-muted" : undefined}
        />
      </button>
    </div>
  )
}

const Inner = ({
  field,
  inputProps,
  disabled,
}: {
  field: ControllerRenderProps<DataGridFormValues, string>
  inputProps: InputProps
  disabled?: boolean
}) => {
  const { ref, value, onChange: _, onBlur, ...fieldProps } = field
  const {
    ref: inputRef,
    onChange,
    onBlur: onInputBlur,
    onFocus,
  } = inputProps

  const localValue = toMediaList(value)

  const combinedRef = useCombinedRefs(inputRef, ref)

  // The cell never edits the list itself (the media modal writes the form
  // directly), so blurring commits the current value unchanged.
  const handleOnChange = () => {
    onChange(value, value)
  }

  const hasMedia = localValue && localValue.length > 0
  const MAX_VISIBLE_THUMBNAILS = 4

  return (
    <div
      className={`flex size-full items-center gap-x-2 ${disabled ? "opacity-50" : ""}`}
      {...fieldProps}
    >
      <div
        ref={combinedRef}
        className={`flex h-full flex-1 items-center gap-1.5 overflow-hidden py-2.5 ${disabled ? "cursor-not-allowed" : "cursor-default"}`}
        onFocus={disabled ? undefined : onFocus}
        onBlur={
          disabled
            ? undefined
            : () => {
                onBlur()
                onInputBlur()
                handleOnChange()
              }
        }
        tabIndex={disabled ? -1 : -1}
      >
        {hasMedia ? (
          <>
            {localValue
              .slice(0, MAX_VISIBLE_THUMBNAILS)
              .map((media, index) => (
                <div
                  key={media.id || `media-${index}`}
                  className="shrink-0"
                >
                  <Thumbnail
                    src={media.url}
                    alt={
                      media.url
                        ? `Product image ${index + 1}`
                        : undefined
                    }
                    size="small"
                  />
                </div>
              ))}
            {localValue.length > MAX_VISIBLE_THUMBNAILS && (
              <div className="flex h-5 w-4 shrink-0 items-center justify-center rounded border border-ui-border-base bg-ui-bg-component text-[10px] font-medium text-ui-fg-subtle">
                +{localValue.length - MAX_VISIBLE_THUMBNAILS}
              </div>
            )}
          </>
        ) : (
          <Thumbnail size="small" />
        )}
      </div>
    </div>
  )
}
