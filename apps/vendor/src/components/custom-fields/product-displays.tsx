import type { ComponentProps } from "react"
import type { CustomDisplayField } from "@mercurjs/dashboard-sdk"
import { Text } from "@medusajs/ui"

type ProductDisplayProps = ComponentProps<NonNullable<CustomDisplayField<"product">["component"]>>

export const ProductHandleDisplay = ({ data }: ProductDisplayProps): React.JSX.Element => (
  <Text size="small" className="text-ui-fg-subtle px-6 py-4">
    <span dir="ltr">/{typeof data?.handle === "string" ? data.handle : null}</span>
  </Text>
)

// ERP ID row for the product detail page's General section (disabled, see
// custom-fields/product.ts).
// type ProductWithMeta = { metadata?: Record<string, unknown> };
// const erpId = (data: ProductWithMeta) =>
//   (data?.metadata?.erp_id as string) ?? "-";
// export const ProductErpIdDisplay = ({ data }: { data: ProductWithMeta }): React.JSX.Element => (
//   <Text size="small" className="text-ui-fg-subtle px-6 py-4">
//     ERP ID: {erpId(data)}
//   </Text>
// )
