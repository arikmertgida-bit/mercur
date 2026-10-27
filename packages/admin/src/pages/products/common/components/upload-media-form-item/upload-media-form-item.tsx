import { useCallback } from "react"
import { useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import config from "virtual:mercur/config"
import {
  FileType,
  FileUpload,
} from "../../../../../components/common/file-upload"
import { Form } from "../../../../../components/common/form"
import { formatFileSize } from "../../../../../lib/format-file-size"
import { MediaSchema } from "../../../product-create/constants"

type Media = z.infer<typeof MediaSchema>

/**
 * The slice of the host form this item works on. Both hosts (product create
 * and product media edit) render it inside their RHF provider.
 */
type MediaFieldValues = { media: Media[] }

const SUPPORTED_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/svg+xml",
]

const SUPPORTED_FORMATS_FILE_EXTENSIONS = [
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".svg",
]

export const UploadMediaFormItem = ({
  append,
  showHint = true,
}: {
  append: (value: Media) => void
  showHint?: boolean
}) => {
  const { t } = useTranslation()
  const form = useFormContext<MediaFieldValues>()

  const hasInvalidFiles = useCallback(
    (fileList: FileType[]) => {
      const invalidFile = fileList.find(
        (f) => !SUPPORTED_FORMATS.includes(f.file.type)
      )

      if (invalidFile) {
        form.setError("media", {
          type: "invalid_file",
          message: t("products.media.invalidFileType", {
            name: invalidFile.file.name,
            types: SUPPORTED_FORMATS_FILE_EXTENSIONS.join(", "),
          }),
        })

        return true
      }

      const oversizedFile = fileList.find(
        (f) => f.file.size > config.imageLimit
      )

      if (oversizedFile) {
        form.setError("media", {
          type: "invalid_file",
          message: t("products.media.fileTooLarge", {
            name: oversizedFile.file.name,
            size: formatFileSize(config.imageLimit),
          }),
        })

        return true
      }

      return false
    },
    [form, t]
  )

  const onUploaded = useCallback(
    (files: FileType[]) => {
      form.clearErrors("media")
      if (hasInvalidFiles(files)) {
        return
      }

      files.forEach((f) => append({ ...f, isThumbnail: false }))
    },
    [form, append, hasInvalidFiles]
  )

  return (
    <Form.Field
      control={form.control}
      name="media"
      render={() => {
        return (
          <Form.Item>
            <div className="flex flex-col gap-y-2">
              <div className="flex flex-col gap-y-1">
                <Form.Label optional>{t("products.media.label")}</Form.Label>
                {showHint && (
                  <Form.Hint>{t("products.media.editHint")}</Form.Hint>
                )}
              </div>
              <Form.Control>
                <FileUpload
                  label={t("products.media.uploadImagesLabel")}
                  hint={t("products.media.uploadImagesHint")}
                  hasError={!!form.formState.errors.media}
                  formats={SUPPORTED_FORMATS}
                  onUploaded={onUploaded}
                />
              </Form.Control>
              <Form.ErrorMessage />
            </div>
          </Form.Item>
        )
      }}
    />
  )
}
