import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, toast } from "@medusajs/ui"
import { Trash } from "@medusajs/icons"

import { FileUpload, FilePreview } from "@mercurjs/dashboard-shared"
import type { FileType } from "@mercurjs/dashboard-shared"
import { useImportProducts } from "../../../../hooks/api/product-import-export"
import { downloadImportTemplate } from "../helpers/import-template"

type UploadImportProps = {
  onSuccess: (summary: { created: number }) => void
}

export const UploadImport = ({ onSuccess }: UploadImportProps) => {
  const { t } = useTranslation()
  const [file, setFile] = useState<FileType | null>(null)

  const { mutateAsync: importProducts, isPending } = useImportProducts({
    onSuccess: (data) => {
      toast.success(
        t("productImportExport.importSuccessToast", {
          count: data.summary.created,
        })
      )
      onSuccess(data.summary)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleFileUpload = (files: FileType[]) => {
    const uploaded = files[0]
    if (uploaded) {
      setFile(uploaded)
    }
  }

  const handleImport = async () => {
    if (!file) {
      return
    }
    await importProducts(file.file)
  }

  const handleRemoveFile = () => {
    setFile(null)
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
        <span className="text-ui-fg-subtle txt-small">
          {t("productImportExport.importHint")}{" "}
          <button
            type="button"
            className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover underline"
            onClick={downloadImportTemplate}
          >
            {t("productImportExport.downloadTemplate")}
          </button>
        </span>
      </div>

      {!file ? (
        <FileUpload
          label={t("productImportExport.uploadLabel")}
          hint={t("productImportExport.uploadHint")}
          formats={[".csv", "text/csv"]}
          onUploaded={handleFileUpload}
          multiple={false}
        />
      ) : (
        <FilePreview
          filename={file.file.name}
          loading={isPending}
          activity={t("productImportExport.importingActivity")}
          actions={[
            {
              actions: [
                {
                  icon: <Trash />,
                  label: t("actions.delete"),
                  onClick: handleRemoveFile,
                },
              ],
            },
          ]}
        />
      )}

      {file && (
        <div className="flex justify-end">
          <Button onClick={handleImport} isLoading={isPending} disabled={!file}>
            {t("productImportExport.import")}
          </Button>
        </div>
      )}
    </div>
  )
}
