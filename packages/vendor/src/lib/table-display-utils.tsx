import React from "react"
import { Badge, StatusBadge, Tooltip } from "@medusajs/ui"
import { HttpTypes, JsonRecord, JsonValue } from "@mercurjs/types"
import ReactCountryFlag from "react-country-flag"
import i18n from "i18next"
import { getCountryByIso2 } from "./data/countries"
import { getLocalizedCountryName } from "./format-country-name"
import { getStylizedAmount } from "./money-amount-helpers"

type DisplayStrategyFn = (value: JsonValue, row?: JsonRecord) => React.ReactNode

const getNestedValue = (obj: JsonRecord, path: string): JsonValue | undefined => {
  return path.split(".").reduce<JsonValue | undefined>((current, key) => {
    if (current === null || current === undefined) {
      return undefined
    }

    if (typeof current !== "object" || Array.isArray(current)) {
      return undefined
    }

    return (current as JsonRecord)[key]
  }, obj as JsonValue)
}

const formatDate = (
  date: string | Date,
  format: "short" | "long" | "relative" = "short"
) => {
  const dateObj = new Date(date)

  switch (format) {
    case "short":
      return dateObj.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    case "long":
      return dateObj.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    case "relative": {
      const now = new Date()
      const diffInMs = now.getTime() - dateObj.getTime()
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

      if (diffInDays === 0) return "Today"
      if (diffInDays === 1) return "Yesterday"
      if (diffInDays < 7) return `${diffInDays} days ago`

      return dateObj.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    }
    default:
      return dateObj.toLocaleDateString()
  }
}

const toDisplayString = (value: JsonValue): string => {
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  return JSON.stringify(value)
}

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "captured":
        return "green"
      case "pending":
      case "awaiting":
        return "orange"
      case "failed":
      case "canceled":
        return "red"
      default:
        return "grey"
    }
  }

  return (
    <StatusBadge color={getStatusColor(status)}>
      {status}
    </StatusBadge>
  )
}

const FulfillmentStatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "fulfilled":
      case "shipped":
        return "green"
      case "partially_fulfilled":
      case "preparing":
        return "orange"
      case "canceled":
      case "returned":
        return "red"
      case "pending":
      case "not_fulfilled":
        return "grey"
      default:
        return "grey"
    }
  }

  return (
    <StatusBadge color={getStatusColor(status)}>
      {status}
    </StatusBadge>
  )
}

const GenericStatusBadge = ({ status }: { status: string }) => {
  return (
    <Badge variant="outline" className="capitalize">
      {status}
    </Badge>
  )
}

const objectDisplayValue = (value: JsonValue): string => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "-"
  }

  const obj = value as JsonRecord

  if (typeof obj.name === "string") return obj.name
  if (typeof obj.title === "string") return obj.title
  if (typeof obj.email === "string") return obj.email
  if (typeof obj.display_name === "string") return obj.display_name

  return JSON.stringify(value)
}

export const DISPLAY_STRATEGIES = {
  status: {
    payment: (value: JsonValue) => (
      <PaymentStatusBadge status={toDisplayString(value)} />
    ),
    fulfillment: (value: JsonValue) => (
      <FulfillmentStatusBadge status={toDisplayString(value)} />
    ),
    default: (value: JsonValue) => (
      <GenericStatusBadge status={toDisplayString(value)} />
    ),
  },

  currency: {
    default: (value: JsonValue, row?: JsonRecord) => {
      if (value === null || value === undefined) return "-"
      const currencyCode =
        typeof row?.currency_code === "string" ? row.currency_code : "USD"
      const formatted = getStylizedAmount(Number(value), currencyCode)

      return (
        <div className="flex h-full w-full items-center justify-end text-right">
          <span className="truncate">{formatted}</span>
        </div>
      )
    },
  },

  timestamp: {
    creation: (value: JsonValue) =>
      value ? formatDate(String(value), "short") : "-",
    update: (value: JsonValue) =>
      value ? formatDate(String(value), "relative") : "-",
    default: (value: JsonValue) =>
      value ? formatDate(String(value), "short") : "-",
  },

  identifier: {
    order: (value: JsonValue) => `#${toDisplayString(value)}`,
    default: (value: JsonValue) => toDisplayString(value),
  },

  email: {
    default: (value: JsonValue) => toDisplayString(value) || "-",
  },

  enum: {
    default: (value: JsonValue) => (
      <GenericStatusBadge status={toDisplayString(value)} />
    ),
  },

  string: {
    default: (value: JsonValue) => toDisplayString(value) || "-",
  },

  number: {
    default: (value: JsonValue) => {
      if (typeof value === "number") {
        return value.toLocaleString()
      }

      return "0"
    },
  },

  boolean: {
    default: (value: JsonValue) => (
      <Badge variant={value ? "solid" : "outline"}>
        {value ? "Yes" : "No"}
      </Badge>
    ),
  },

  object: {
    relationship: (value: JsonValue) => objectDisplayValue(value),
    default: (value: JsonValue) => objectDisplayValue(value),
  },

  date: {
    default: (value: JsonValue) =>
      value ? formatDate(String(value), "short") : "-",
  },

  datetime: {
    default: (value: JsonValue) =>
      value ? formatDate(String(value), "long") : "-",
  },

  computed: {
    display: (value: JsonValue) => toDisplayString(value) || "-",
    default: (value: JsonValue) => toDisplayString(value) || "-",
  },
}

export const getDisplayStrategy = (
  column: HttpTypes.AdminColumn
): DisplayStrategyFn => {
  const semanticStrategies =
    DISPLAY_STRATEGIES[column.semantic_type as keyof typeof DISPLAY_STRATEGIES]
  if (semanticStrategies) {
    const contextStrategy =
      semanticStrategies[column.context as keyof typeof semanticStrategies]
    if (contextStrategy) return contextStrategy

    const defaultStrategy = semanticStrategies.default
    if (defaultStrategy) return defaultStrategy
  }

  const dataType = column.data_type === "text" ? "string" : column.data_type
  const dataTypeStrategies =
    DISPLAY_STRATEGIES[dataType as keyof typeof DISPLAY_STRATEGIES]
  if (dataTypeStrategies) {
    const defaultStrategy = dataTypeStrategies.default
    if (defaultStrategy) return defaultStrategy
  }

  return (value: JsonValue) => toDisplayString(value) || "-"
}

export const COMPUTED_COLUMN_FUNCTIONS = {
  customer_name: (row: JsonRecord) => {
    const customer =
      typeof row.customer === "object" &&
      row.customer !== null &&
      !Array.isArray(row.customer)
        ? (row.customer as JsonRecord)
        : null

    if (customer) {
      const fullName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
      if (fullName) return fullName
      if (typeof customer.email === "string") return customer.email
      if (typeof customer.phone === "string") return customer.phone
    }

    return "Guest"
  },

  address_summary: (row: JsonRecord, column?: HttpTypes.AdminColumn) => {
    let address: JsonRecord | null = null

    const shippingAddress = row.shipping_address
    const billingAddress = row.billing_address

    if (column?.field === "shipping_address_display") {
      address =
        typeof shippingAddress === "object" &&
        shippingAddress !== null &&
        !Array.isArray(shippingAddress)
          ? (shippingAddress as JsonRecord)
          : null
    } else if (column?.field === "billing_address_display") {
      address =
        typeof billingAddress === "object" &&
        billingAddress !== null &&
        !Array.isArray(billingAddress)
          ? (billingAddress as JsonRecord)
          : null
    } else {
      address =
        typeof shippingAddress === "object" &&
        shippingAddress !== null &&
        !Array.isArray(shippingAddress)
          ? (shippingAddress as JsonRecord)
          : typeof billingAddress === "object" &&
              billingAddress !== null &&
              !Array.isArray(billingAddress)
            ? (billingAddress as JsonRecord)
            : null
    }

    if (!address) return "-"

    const parts: string[] = []

    if (typeof address.address_1 === "string") {
      parts.push(address.address_1)
    }

    const locationParts: string[] = []
    if (typeof address.city === "string") locationParts.push(address.city)
    if (typeof address.province === "string") locationParts.push(address.province)
    if (typeof address.postal_code === "string") {
      locationParts.push(address.postal_code)
    }

    if (locationParts.length > 0) {
      parts.push(locationParts.join(", "))
    }

    if (typeof address.country_code === "string") {
      parts.push(address.country_code.toUpperCase())
    }

    return parts.join(" • ") || "-"
  },

  country_code: (row: JsonRecord) => {
    const shippingAddress = row.shipping_address
    const address =
      typeof shippingAddress === "object" &&
      shippingAddress !== null &&
      !Array.isArray(shippingAddress)
        ? (shippingAddress as JsonRecord)
        : null
    const countryCode =
      typeof address?.country_code === "string" ? address.country_code : null

    if (!countryCode) return <div className="flex w-full justify-center">-</div>

    const country = getCountryByIso2(countryCode)
    const displayName =
      getLocalizedCountryName(country, i18n.language) || countryCode.toUpperCase()

    return (
      <div className="flex w-full items-center justify-center">
        <Tooltip content={displayName}>
          <div className="flex size-4 items-center justify-center overflow-hidden rounded-sm">
            <ReactCountryFlag
              countryCode={countryCode.toUpperCase()}
              svg
              style={{
                width: "16px",
                height: "16px",
              }}
              aria-label={displayName}
            />
          </div>
        </Tooltip>
      </div>
    )
  },
}

export const ENTITY_COLUMN_OVERRIDES = {
  orders: {
    customer: {
      accessor: (row: JsonRecord) => {
        const shipping =
          typeof row.shipping_address === "object" &&
          row.shipping_address !== null &&
          !Array.isArray(row.shipping_address)
            ? (row.shipping_address as JsonRecord)
            : null
        const customer =
          typeof row.customer === "object" &&
          row.customer !== null &&
          !Array.isArray(row.customer)
            ? (row.customer as JsonRecord)
            : null

        if (shipping?.first_name || shipping?.last_name) {
          return `${shipping.first_name || ""} ${shipping.last_name || ""}`.trim()
        }
        if (customer?.first_name || customer?.last_name) {
          return `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
        }
        return typeof customer?.email === "string" ? customer.email : "Guest"
      },
    },
  },
}

export const getEntityAccessor = (
  entity: string,
  fieldName: string,
  column?: HttpTypes.AdminColumn
): ((row: JsonRecord) => JsonValue | React.ReactNode) => {
  if (column?.computed) {
    const computationFn =
      COMPUTED_COLUMN_FUNCTIONS[
        column.computed.type as keyof typeof COMPUTED_COLUMN_FUNCTIONS
      ]
    if (computationFn) {
      return (row: JsonRecord) => computationFn(row, column)
    }
  }

  const entityOverrides =
    ENTITY_COLUMN_OVERRIDES[entity as keyof typeof ENTITY_COLUMN_OVERRIDES]
  if (entityOverrides) {
    const fieldOverride =
      entityOverrides[fieldName as keyof typeof entityOverrides]
    if (fieldOverride?.accessor) {
      return fieldOverride.accessor
    }
  }

  return (row: JsonRecord) => getNestedValue(row, fieldName)
}
