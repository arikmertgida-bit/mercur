import { ReactNode, Children } from "react"
import { useLoaderData } from "react-router-dom"

import { WidgetZone, useRequiredParam } from "@mercurjs/dashboard-shared"
import { SingleColumnPage } from "../../../components/layout/pages"
import { useTaxRegion } from "../../../hooks/api/tax-regions"
import { TaxRegionProvinceDetailSection } from "./components/tax-region-province-detail-section"

import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import { TaxRegionProvinceOverrideSection } from "./components/tax-region-province-override-section"
import { taxRegionLoader } from "./loader"

const Root = ({ children }: { children?: ReactNode }) => {
  const provinceId = useRequiredParam("province_id")

  const initialData = useLoaderData<typeof taxRegionLoader>()

  const {
    tax_region: taxRegion,
    isLoading,
    isError,
    error,
  } = useTaxRegion(provinceId, undefined, { initialData })

  if (isLoading || !taxRegion) {
    return <SingleColumnPageSkeleton sections={2} showJSON />
  }

  if (isError) {
    throw error
  }

  return Children.count(children) > 0 ? (
    <SingleColumnPage data={taxRegion} showJSON>
      {children}
    </SingleColumnPage>
  ) : (
    <SingleColumnPage data={taxRegion} showJSON>
      <WidgetZone id="tax-regions.province.detail.main" data={taxRegion}>
        <TaxRegionProvinceDetailSection taxRegion={taxRegion} />
        <TaxRegionProvinceOverrideSection taxRegion={taxRegion} />
      </WidgetZone>
    </SingleColumnPage>
  )
}

export const TaxRegionProvinceDetailPage = Object.assign(Root, {
  DetailSection: TaxRegionProvinceDetailSection,
  OverrideSection: TaxRegionProvinceOverrideSection,
})
