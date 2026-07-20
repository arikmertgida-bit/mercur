import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Container,
  Heading,
  Text,
  Select,
  StatusBadge,
  Table,
  usePrompt,
  toast,
} from "@medusajs/ui"
import { Photo, CheckCircleSolid, EyeSlash } from "@medusajs/icons"
import { ActionMenu, NoRecords, Thumbnail } from "@mercurjs/dashboard-shared"

import { client } from "../../lib/client"

export const config = {
  label: "domain",
  translationNs: "reportedImages",
  icon: Photo,
  rank: 88,
}

type ReportStatus = "pending" | "resolved"

type ReviewImageReportRow = {
  id: string
  review_image_id: string
  customer_id: string
  reason: string
  status: ReportStatus
  action_taken?: string | null
  customer_name: string
  image_url: string | null
  image_is_hidden: boolean | null
}

const STATUS_COLOR: Record<ReportStatus, "orange" | "green"> = {
  pending: "orange",
  resolved: "green",
}

const PAGE_SIZE = 20

const ReportedImagesPage = () => {
  const { t } = useTranslation()
  const dialog = usePrompt()
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<ReportStatus | "all">("all")
  const [offset, setOffset] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ["review-image-reports", status, offset],
    queryFn: () =>
      client.admin.reviewImageReports.query({
        limit: PAGE_SIZE,
        offset,
        ...(status !== "all" ? { status } : {}),
      }),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["review-image-reports"] })

  const resolve = useMutation({
    mutationFn: (input: { id: string; action: "hide" | "publish" }) =>
      client.admin.reviewImageReports.$id.resolve.mutate({
        $id: input.id,
        action: input.action,
      }),
    onSuccess: () => {
      toast.success(t("reportedImages.resolveSuccess"))
      invalidate()
    },
    onError: () => {
      toast.error(t("reportedImages.resolveError"))
    },
  })

  const handleRemove = async (report: ReviewImageReportRow) => {
    const confirmed = await dialog({
      title: t("reportedImages.removePrompt.title"),
      description: t("reportedImages.removePrompt.description"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
      variant: "danger",
    })
    if (confirmed) {
      resolve.mutate({ id: report.id, action: "hide" })
    }
  }

  const handleDismiss = async (report: ReviewImageReportRow) => {
    const confirmed = await dialog({
      title: t("reportedImages.dismissPrompt.title"),
      description: t("reportedImages.dismissPrompt.description"),
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
    })
    if (confirmed) {
      resolve.mutate({ id: report.id, action: "publish" })
    }
  }

  const reports = (data?.reports ?? []) as ReviewImageReportRow[]
  const count = data?.count ?? 0

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("reportedImages.domain")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("reportedImages.subtitle")}
          </Text>
        </div>
        <Select
          size="small"
          value={status}
          onValueChange={(value) => {
            setStatus(value as ReportStatus | "all")
            setOffset(0)
          }}
        >
          <Select.Trigger className="w-[180px]">
            <Select.Value placeholder={t("reportedImages.filterAll")} />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">{t("reportedImages.filterAll")}</Select.Item>
            <Select.Item value="pending">{t("reportedImages.status.pending")}</Select.Item>
            <Select.Item value="resolved">{t("reportedImages.status.resolved")}</Select.Item>
          </Select.Content>
        </Select>
      </div>

      {!isLoading && reports.length === 0 ? (
        <NoRecords />
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("reportedImages.columns.image")}</Table.HeaderCell>
              <Table.HeaderCell>{t("reportedImages.columns.reporter")}</Table.HeaderCell>
              <Table.HeaderCell>{t("reportedImages.columns.reason")}</Table.HeaderCell>
              <Table.HeaderCell>{t("reportedImages.columns.status")}</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {reports.map((report) => (
              <Table.Row key={report.id}>
                <Table.Cell>
                  {report.image_url ? (
                    <Thumbnail src={report.image_url} />
                  ) : (
                    <Text size="small" className="text-ui-fg-subtle">
                      {t("reportedImages.imageRemoved")}
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell>{report.customer_name}</Table.Cell>
                <Table.Cell>
                  <Text size="small">{report.reason}</Text>
                </Table.Cell>
                <Table.Cell>
                  <StatusBadge color={STATUS_COLOR[report.status]}>
                    {t(`reportedImages.status.${report.status}`)}
                  </StatusBadge>
                </Table.Cell>
                <Table.Cell>
                  <ActionMenu
                    groups={[
                      {
                        actions: [
                          {
                            label: t("reportedImages.actions.remove"),
                            icon: <CheckCircleSolid />,
                            onClick: () => handleRemove(report),
                            disabled: report.status === "resolved",
                          },
                          {
                            label: t("reportedImages.actions.dismiss"),
                            icon: <EyeSlash />,
                            onClick: () => handleDismiss(report),
                            disabled: report.status === "resolved",
                          },
                        ],
                      },
                    ]}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {count > PAGE_SIZE ? (
        <Table.Pagination
          count={count}
          pageSize={PAGE_SIZE}
          pageIndex={offset / PAGE_SIZE}
          pageCount={Math.ceil(count / PAGE_SIZE)}
          canPreviousPage={offset > 0}
          canNextPage={offset + PAGE_SIZE < count}
          previousPage={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          nextPage={() => setOffset(offset + PAGE_SIZE)}
        />
      ) : null}
    </Container>
  )
}

export default ReportedImagesPage
