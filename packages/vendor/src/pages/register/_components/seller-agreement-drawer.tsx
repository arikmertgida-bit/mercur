import { Button, Drawer, Heading, Table, Tabs, Text } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { useDocumentDirection } from "@hooks/use-document-direction"

const SELLER_AGREEMENT_TAB_IDS = [
  "platformStatus",
  "storeDocuments",
  "productStandards",
  "stockOperations",
  "paymentSystem",
  "returnDispute",
  "privacyKVKK",
  "systemSecurity",
  "platformReputation",
  "approvalEnactment",
  "commissionTable",
] as const

type SellerAgreementTabId = (typeof SELLER_AGREEMENT_TAB_IDS)[number]

const COMMISSION_CATEGORY_IDS = [
  "womenFashion",
  "menFashion",
  "electronics",
  "motherChild",
  "homeLife",
  "supermarket",
  "cosmetics",
  "shoesBags",
  "sportsOutdoor",
  "booksHobbies",
  "autoMoto",
  "privateLife",
] as const

type CommissionCategoryId = (typeof COMMISSION_CATEGORY_IDS)[number]

interface CommissionCategoryRate {
  net: number
  vat: number
  total: number
}

const COMMISSION_RATES: Record<CommissionCategoryId, CommissionCategoryRate> = {
  womenFashion: { net: 10, vat: 20, total: 12 },
  menFashion: { net: 10, vat: 20, total: 12 },
  electronics: { net: 10, vat: 20, total: 12 },
  motherChild: { net: 10, vat: 20, total: 12 },
  homeLife: { net: 10, vat: 20, total: 12 },
  supermarket: { net: 4, vat: 20, total: 4.8 },
  cosmetics: { net: 10, vat: 20, total: 12 },
  shoesBags: { net: 14, vat: 20, total: 16.8 },
  sportsOutdoor: { net: 14, vat: 20, total: 16.8 },
  booksHobbies: { net: 4, vat: 20, total: 4.8 },
  autoMoto: { net: 10, vat: 20, total: 12 },
  privateLife: { net: 20, vat: 20, total: 24 },
}

interface SellerAgreementDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SellerAgreementDrawer = ({
  open,
  onOpenChange,
}: SellerAgreementDrawerProps) => {
  const { t } = useTranslation()
  const dir = useDocumentDirection()
  const [activeTab, setActiveTab] = useState<string>(SELLER_AGREEMENT_TAB_IDS[0])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content aria-describedby={undefined}>
        <Drawer.Header>
          <Drawer.Title asChild>
            <Heading>{t("sellerAgreement.title")}</Heading>
          </Drawer.Title>
          <Text size="small" className="text-ui-fg-subtle">
            {t("sellerAgreement.lastUpdated")}
          </Text>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List dir={dir} className="flex-nowrap overflow-x-auto">
              {SELLER_AGREEMENT_TAB_IDS.map((tabId) => (
                <Tabs.Trigger
                  key={tabId}
                  value={tabId}
                  className="whitespace-nowrap"
                  data-testid={`seller-agreement-tab-${tabId}`}
                >
                  {t(`sellerAgreement.tabs.${tabId}`)}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {SELLER_AGREEMENT_TAB_IDS.map((tabId) => (
              <Tabs.Content key={tabId} value={tabId} className="pt-4">
                <SellerAgreementTabContent tabId={tabId} />
              </Tabs.Content>
            ))}
          </Tabs>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button size="small" variant="secondary" type="button">
              {t("actions.close")}
            </Button>
          </Drawer.Close>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const SellerAgreementTabContent = ({ tabId }: { tabId: SellerAgreementTabId }) => {
  const { t } = useTranslation()

  if (tabId === "stockOperations") {
    return (
      <div className="flex flex-col gap-y-4">
        <div>
          <Heading level="h3" className="mb-1">
            {t("sellerAgreement.sections.stockOperations.subhead1")}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle leading-relaxed">
            {t("sellerAgreement.sections.stockOperations.content1")}
          </Text>
        </div>
        <div>
          <Heading level="h3" className="mb-1">
            {t("sellerAgreement.sections.stockOperations.subhead2")}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle leading-relaxed">
            {t("sellerAgreement.sections.stockOperations.content2")}
          </Text>
        </div>
      </div>
    )
  }

  if (tabId === "commissionTable") {
    return (
      <div className="flex flex-col gap-y-4">
        <Text size="small" className="text-ui-fg-subtle leading-relaxed">
          {t("sellerAgreement.sections.commissionTable.description")}
        </Text>
        <div className="border-ui-border-base overflow-x-auto rounded-lg border">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>
                  {t("sellerAgreement.sections.commissionTable.col.category")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("sellerAgreement.sections.commissionTable.col.netCommission")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("sellerAgreement.sections.commissionTable.col.vat")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("sellerAgreement.sections.commissionTable.col.totalInclVat")}
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {COMMISSION_CATEGORY_IDS.map((categoryId) => {
                const rate = COMMISSION_RATES[categoryId]
                return (
                  <Table.Row key={categoryId}>
                    <Table.Cell>
                      {t(`sellerAgreement.sections.commissionTable.categories.${categoryId}`)}
                    </Table.Cell>
                    <Table.Cell>{rate.net}%</Table.Cell>
                    <Table.Cell>{rate.vat}%</Table.Cell>
                    <Table.Cell>{rate.total}%</Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        </div>
        <Text size="xsmall" className="text-ui-fg-muted">
          {t("sellerAgreement.sections.commissionTable.footnote")}
        </Text>
      </div>
    )
  }

  return (
    <Text size="small" className="text-ui-fg-subtle leading-relaxed">
      {t(`sellerAgreement.sections.${tabId}.content`)}
    </Text>
  )
}
