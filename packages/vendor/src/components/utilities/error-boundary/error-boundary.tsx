import { ExclamationCircle } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useLocation, useRouteError } from "react-router-dom"

import { isClientError } from "../../../lib/is-fetch-error"

// Vite content-hashes every chunk on each build. A tab left open across a
// redeploy still holds the old entry bundle, which then tries to dynamic
// import() a chunk filename that no longer exists on disk -> the import
// rejects and lands here. That's a stale-tab artifact, not a real app
// error, so it gets one silent reload instead of a dead error screen.
const CHUNK_LOAD_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i

const getChunkReloadStorageKey = (chunkError: Error): string => {
  const chunkUrl = chunkError.message.match(/https?:\/\/\S+\.js/)?.[0]
  return `mercur:vendor:chunk-reload:${chunkUrl ?? "unknown-chunk"}`
}

export const ErrorBoundary = () => {
  const error = useRouteError()
  const location = useLocation()
  const { t } = useTranslation()
  const [isRecoveringChunk, setIsRecoveringChunk] = useState(false)

  const chunkLoadError =
    error instanceof Error && CHUNK_LOAD_ERROR_PATTERN.test(error.message)
      ? error
      : null

  useEffect(() => {
    if (!chunkLoadError) {
      return
    }

    const storageKey = getChunkReloadStorageKey(chunkLoadError)

    if (window.sessionStorage.getItem(storageKey)) {
      return
    }

    window.sessionStorage.setItem(storageKey, String(Date.now()))
    setIsRecoveringChunk(true)
    window.location.reload()
  }, [chunkLoadError])

  if (isRecoveringChunk) {
    return null
  }

  let code: number | null = null

  if (error instanceof Error && isClientError(error)) {
    if (error.status === 401) {
      return <Navigate to="/login" state={{ from: location }} replace />
    }

    code = error.status ?? null
  }

  let title: string
  let message: string

  switch (code) {
    case 400:
      title = t("errorBoundary.badRequestTitle")
      message = t("errorBoundary.badRequestMessage")
      break
    case 404:
      title = t("errorBoundary.notFoundTitle")
      message = t("errorBoundary.notFoundMessage")
      break
    case 500:
      title = t("errorBoundary.internalServerErrorTitle")
      message = t("errorBoundary.internalServerErrorMessage")
      break
    default:
      title = t("errorBoundary.defaultTitle")
      message = t("errorBoundary.defaultMessage")
      break
  }

  return (
    <div className="flex size-full min-h-[calc(100vh-57px-24px)] items-center justify-center">
      <div className="flex flex-col gap-y-6">
        <div className="text-ui-fg-subtle flex flex-col items-center gap-y-3">
          <ExclamationCircle />
          <div className="flex flex-col items-center justify-center gap-y-1">
            <Text size="small" leading="compact" weight="plus">
              {title}
            </Text>
            <Text
              size="small"
              className="text-ui-fg-muted text-balance text-center"
            >
              {message}
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}
