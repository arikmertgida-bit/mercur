import { type FieldValues, useFormContext } from "react-hook-form"
import { Input, Switch, Textarea } from "@medusajs/ui"
import type { CustomFormField } from "@mercurjs/dashboard-sdk"
import type { JsonRecord } from "@mercurjs/types"
import { z } from "zod"
import { Form } from "../components/common/form"
import { toInputValue } from "../lib/json"
import { useExtension } from "./context"

type FieldControlType = "boolean" | "number" | "string" | "textarea"

// Zod wrappers that carry the base schema on `def.innerType` — unwrap them so an
// `optional()`/`nullable()`/`default()` field maps to its underlying control.
const ZOD_WRAPPER_TYPES = new Set([
  "optional",
  "nullable",
  "default",
  "prefault",
  "nonoptional",
  "readonly",
  "catch",
])

function toControlType(type: string | undefined): FieldControlType {
  switch (type) {
    case "boolean":
    case "number":
    case "string":
      return type
    default:
      return "textarea"
  }
}

function zodType(field: CustomFormField): FieldControlType {
  const { validation } = field

  if (!(validation instanceof z.ZodType)) {
    return toControlType(validation.def?.type)
  }

  let schema: z.ZodType | undefined = validation

  while (schema && ZOD_WRAPPER_TYPES.has(schema.def.type)) {
    const inner: z.ZodType | undefined =
      "innerType" in schema.def && schema.def.innerType instanceof z.ZodType
        ? schema.def.innerType
        : undefined
    schema = inner
  }

  return toControlType(schema?.def.type)
}

type ExtensionFormValues = FieldValues & { additional_data: JsonRecord }

type FieldProps = {
  name: string
  field: CustomFormField
  data?: JsonRecord
}

const ExtensionField = ({ name, field }: FieldProps) => {
  // The zone renders inside the host form's provider. Reading the control
  // from context keeps hosts' own form value types (react-hook-form's
  // `Control` is invariant in them) out of this component's props.
  const { control } = useFormContext<ExtensionFormValues>()
  const type = zodType(field)
  const Component = field.component

  return (
    <Form.Field
      control={control}
      name={`additional_data.${name}`}
      render={({ field: rhf }) => (
        <Form.Item>
          <Form.Label>{field.label ?? name}</Form.Label>
          {field.description && <Form.Hint>{field.description}</Form.Hint>}
          <Form.Control>
            {Component ? (
              <Component />
            ) : type === "boolean" ? (
              <Switch
                checked={!!rhf.value}
                onCheckedChange={rhf.onChange}
              />
            ) : type === "number" ? (
              <Input
                type="number"
                placeholder={field.placeholder}
                {...rhf}
                value={toInputValue(rhf.value)}
              />
            ) : type === "string" ? (
              <Input
                placeholder={field.placeholder}
                {...rhf}
                value={toInputValue(rhf.value)}
              />
            ) : (
              <Textarea
                placeholder={field.placeholder}
                {...rhf}
                value={toInputValue(rhf.value)}
              />
            )}
          </Form.Control>
          <Form.ErrorMessage />
        </Form.Item>
      )}
    />
  )
}

// `data` is generic for the same reason as `WidgetZone`'s: hosts pass the
// concrete entity DTO being edited (e.g. `AdminCampaign`), which carries no
// index signature, while custom fields are declared against the erased
// `JsonRecord` shape. Spreading into a fresh object literal before
// forwarding bridges the two without a type assertion.
export type FormExtensionZoneProps<TData = JsonRecord> = {
  model: string
  zone: string
  tab?: string
  data?: TData
}

/**
 * Renders a model's custom form fields for a given zone/tab under the
 * `additional_data.<field>` RHF namespace (Medusa's convention), through the
 * mandated `Form.Field → Form.Item` primitive chain. Must render inside the
 * host form's `Form` provider (e.g. `RouteDrawer.Form`).
 */
export const FormExtensionZone = <TData = JsonRecord,>({
  model,
  zone,
  tab,
  data,
}: FormExtensionZoneProps<TData>) => {
  const fields = useExtension().getFormFields(model, zone, tab)
  const fieldData = data && { ...data }
  if (fields.length === 0) return null

  return (
    <div className="flex flex-col gap-y-4">
      {fields.map(({ name, field }) => (
        <ExtensionField
          key={name}
          name={name}
          field={field}
          data={fieldData}
        />
      ))}
    </div>
  )
}
