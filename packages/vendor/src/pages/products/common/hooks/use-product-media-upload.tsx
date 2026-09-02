import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { z } from "zod"

import { sdk } from "@lib/client"
import { MediaSchema } from "../../create/constants"

type Media = z.infer<typeof MediaSchema>

type UploadedFile = { id?: string; url: string }

type UploadEntryStatus = "uploading" | "done" | "error"

type UploadEntry = {
  status: UploadEntryStatus
  result?: UploadedFile
}

export type ResolvedMediaEntry = {
  id?: string
  url: string
  isThumbnail: boolean
  // Only set for entries uploaded in this session — lets callers (e.g. the
  // create-flow's variant-media matching) correlate the resolved upload
  // back to the local id the seller's selection was tracked under.
  clientMediaId?: string
}

type RegisterableFile = { id: string; file: File }

type ProductMediaUploadContextValue = {
  registerFiles: (entries: RegisterableFile[]) => void
  removeEntry: (id: string) => void
  getEntryStatus: (id: string) => UploadEntryStatus | undefined
  isUploading: boolean
  hasFailedUploads: boolean
  // Returns the fully resolved media list (existing entries passed through,
  // freshly picked files replaced by their uploaded url/id), or `null` when
  // at least one entry is still uploading or failed — callers must block
  // submission in that case rather than send partial/broken data.
  resolveMedia: (media: Media[]) => ResolvedMediaEntry[] | null
}

const ProductMediaUploadContext =
  createContext<ProductMediaUploadContextValue | null>(null)

/**
 * Uploads product images to `/vendor/uploads` the moment a seller picks
 * them, instead of bundling every file into one request at publish/save
 * time. Publish/save then only has to read back already-finished results
 * (see `resolveMedia`), so it never stalls on a big multipart upload and
 * never has to guess what to do with a mid-flight failure.
 */
export const ProductMediaUploadProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [entries, setEntries] = useState<Map<string, UploadEntry>>(new Map())

  const registerFiles = useCallback((files: RegisterableFile[]) => {
    if (files.length === 0) {
      return
    }

    setEntries((prev) => {
      const next = new Map(prev)
      files.forEach(({ id }) => next.set(id, { status: "uploading" }))
      return next
    })

    sdk.vendor.uploads
      .mutate({ files: files.map(({ file }) => file) })
      .then((result) => {
        const uploadedFiles: UploadedFile[] = result?.files ?? []
        setEntries((prev) => {
          const next = new Map(prev)
          files.forEach(({ id }, index) => {
            const uploaded = uploadedFiles[index]
            next.set(
              id,
              uploaded
                ? { status: "done", result: uploaded }
                : { status: "error" }
            )
          })
          return next
        })
      })
      .catch(() => {
        setEntries((prev) => {
          const next = new Map(prev)
          files.forEach(({ id }) => next.set(id, { status: "error" }))
          return next
        })
      })
  }, [])

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      if (!prev.has(id)) {
        return prev
      }
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const getEntryStatus = useCallback(
    (id: string) => entries.get(id)?.status,
    [entries]
  )

  const isUploading = useMemo(
    () => Array.from(entries.values()).some((entry) => entry.status === "uploading"),
    [entries]
  )

  const hasFailedUploads = useMemo(
    () => Array.from(entries.values()).some((entry) => entry.status === "error"),
    [entries]
  )

  const resolveMedia = useCallback(
    (media: Media[]): ResolvedMediaEntry[] | null => {
      const resolved: ResolvedMediaEntry[] = []

      for (const item of media) {
        if (!item.file) {
          resolved.push({
            id: item.id,
            url: item.url,
            isThumbnail: item.isThumbnail,
          })
          continue
        }

        if (!item.id) {
          return null
        }

        const entry = entries.get(item.id)
        if (!entry || entry.status !== "done" || !entry.result) {
          return null
        }

        resolved.push({
          id: entry.result.id,
          url: entry.result.url,
          isThumbnail: item.isThumbnail,
          clientMediaId: item.id,
        })
      }

      return resolved
    },
    [entries]
  )

  const value = useMemo<ProductMediaUploadContextValue>(
    () => ({
      registerFiles,
      removeEntry,
      getEntryStatus,
      isUploading,
      hasFailedUploads,
      resolveMedia,
    }),
    [
      registerFiles,
      removeEntry,
      getEntryStatus,
      isUploading,
      hasFailedUploads,
      resolveMedia,
    ]
  )

  return (
    <ProductMediaUploadContext.Provider value={value}>
      {children}
    </ProductMediaUploadContext.Provider>
  )
}

export const useProductMediaUpload = (): ProductMediaUploadContextValue => {
  const context = useContext(ProductMediaUploadContext)
  if (!context) {
    throw new Error(
      "useProductMediaUpload must be used within a ProductMediaUploadProvider"
    )
  }
  return context
}
