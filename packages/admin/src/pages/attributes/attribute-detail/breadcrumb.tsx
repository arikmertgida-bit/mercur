import { UIMatch } from "react-router-dom"
import type { HttpTypes } from "@mercurjs/types"
import { useProductAttribute } from "../../../hooks/api"

type AttributeDetailBreadcrumbProps = UIMatch<
  HttpTypes.AdminProductAttributeResponse | undefined
>

export const AttributeDetailBreadcrumb = (
  props: AttributeDetailBreadcrumbProps
) => {
  const { id } = props.params || {}

  const { product_attribute: attribute } = useProductAttribute(id!, undefined, {
    initialData: props.data,
    enabled: Boolean(id),
  })

  if (!attribute) {
    return null
  }

  return <span>{attribute.name}</span>
}
