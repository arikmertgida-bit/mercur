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
import { ExclamationCircle, Trash, CheckCircleSolid, EyeSlash } from "@medusajs/icons"
import { ActionMenu, NoRecords } from "@mercurjs/dashboard-shared"

import { client } from "../../lib/client"

export const config = {
  label: "Product Reports",
  icon: ExclamationCircle,
  rank: 89,
}

type ReportStatus = "pending" | "resolved" | "dismissed"

type ProductReportRow = {
  id: string
  product_id: string
  customer_id: string
  customer_name: string
  reason: string
  comment: string | null
  status: ReportStatus
  product_title: string
  product_handle: string | null
  seller_name: string | null
}

const STATUS_COLOR: Record<ReportStatus, "orange" | "green" | "grey"> = {
  pending: "orange",
  resolved: "green",
  dismissed: "grey",
}

const PAGE_SIZE = 20

const ProductReportsPage = () => {
  const { t } = useTranslation()
  const dialog = usePrompt()
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<ReportStatus | "all">("all")
  const [offset, setOffset] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ["product-reports", status, offset],
    queryFn: () =>
      client.admin.productReports.query({
        limit: PAGE_SIZE,
        offset,
        ...(status !== "all" ? { status } : {}),
      }),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["product-reports"] })

  const updateStatus = useMutation({
    mutationFn: (input: { id: string; status: ReportStatus }) =>
      client.admin.productReports.$id.mutate({
        $id: input.id,
        status: input.status,
      }),
    onSuccess: () => {
      toast.success(t("productReports.updateSuccess"))
      invalidate()
    },
    onError: () => {
      toast.error(t("productReports.updateError"))
    },
  })

  const deleteReport = useMutation({
    mutationFn: (id: string) => client.admin.productReports.$id.delete({ $id: id }),
    onSuccess: () => {
      toast.success(t("productReports.deleteSuccess"))
      invalidate()
    },
    onError: () => {
      toast.error(t("productReports.deleteError"))
    },
  })

  const handleResolve = async (report: ProductReportRow) => {
    const confirmed = await dialog({
      title: t("productReports.resolvePrompt.title"),
      description: t("productReports.resolvePrompt.description"),
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
    })
    if (confirmed) {
      updateStatus.mutate({ id: report.id, status: "resolved" })
    }
  }

  const handleDismiss = async (report: ProductReportRow) => {
    const confirmed = await dialog({
      title: t("productReports.dismissPrompt.title"),
      description: t("productReports.dismissPrompt.description"),
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
    })
    if (confirmed) {
      updateStatus.mutate({ id: report.id, status: "dismissed" })
    }
  }

  const handleDelete = async (report: ProductReportRow) => {
    const confirmed = await dialog({
      title: t("productReports.deletePrompt.title"),
      description: t("productReports.deletePrompt.description"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
      variant: "danger",
    })
    if (confirmed) {
      deleteReport.mutate(report.id)
    }
  }

  const reports = (data?.product_reports ?? []) as ProductReportRow[]
  const count = data?.count ?? 0

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("productReports.domain")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("productReports.subtitle")}
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
            <Select.Value placeholder={t("productReports.filterAll")} />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">{t("productReports.filterAll")}</Select.Item>
            <Select.Item value="pending">{t("productReports.status.pending")}</Select.Item>
            <Select.Item value="resolved">{t("productReports.status.resolved")}</Select.Item>
            <Select.Item value="dismissed">{t("productReports.status.dismissed")}</Select.Item>
          </Select.Content>
        </Select>
      </div>

      {!isLoading && reports.length === 0 ? (
        <NoRecords />
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("productReports.columns.product")}</Table.HeaderCell>
              <Table.HeaderCell>{t("productReports.columns.reporter")}</Table.HeaderCell>
              <Table.HeaderCell>{t("productReports.columns.reason")}</Table.HeaderCell>
              <Table.HeaderCell>{t("productReports.columns.status")}</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {reports.map((report) => (
              <Table.Row key={report.id}>
                <Table.Cell>
                  <div className="flex flex-col">
                    <Text size="small" weight="plus">
                      {report.product_title}
                    </Text>
                    {report.seller_name ? (
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {report.seller_name}
                      </Text>
                    ) : null}
                  </div>
                </Table.Cell>
                <Table.Cell>{report.customer_name}</Table.Cell>
                <Table.Cell>
                  <Text size="small">{t(`productReports.reasons.${report.reason}`)}</Text>
                  {report.comment ? (
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {report.comment}
                    </Text>
                  ) : null}
                </Table.Cell>
                <Table.Cell>
                  <StatusBadge color={STATUS_COLOR[report.status]}>
                    {t(`productReports.status.${report.status}`)}
                  </StatusBadge>
                </Table.Cell>
                <Table.Cell>
                  <ActionMenu
                    groups={[
                      {
                        actions: [
                          {
                            label: t("productReports.actions.resolve"),
                            icon: <CheckCircleSolid />,
                            onClick: () => handleResolve(report),
                            disabled: report.status === "resolved",
                          },
                          {
                            label: t("productReports.actions.dismiss"),
                            icon: <EyeSlash />,
                            onClick: () => handleDismiss(report),
                            disabled: report.status === "dismissed",
                          },
                        ],
                      },
                      {
                        actions: [
                          {
                            label: t("actions.delete"),
                            icon: <Trash />,
                            onClick: () => handleDelete(report),
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

export default ProductReportsPage
