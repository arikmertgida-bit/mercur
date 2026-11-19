// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { MemberAreaPermissions } from "@mercurjs/types"
import { SellerRole } from "@mercurjs/types/seller"
import { ReactNode } from "react"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { MemberPermissionAreas } from "../../../../../hooks/api"
import {
  MemberPermissionsFields,
  type MemberPermissionsFormValues,
} from "../member-permissions-fields"
import { permissionsPayload, templateFor } from "../member-permissions"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string): string => key }),
}))

const DATA: MemberPermissionAreas = {
  areas: [
    { id: "orders", max_right: "manage", requires: [] },
    { id: "returns", max_right: "manage", requires: [{ from: "view", area: "orders", right: "view" }] },
    { id: "products", max_right: "manage", requires: [
      { from: "view", area: "catalog", right: "view" },
      { from: "edit", area: "inventory", right: "view" },
      { from: "edit", area: "shipping", right: "view" },
    ] },
    { id: "catalog", max_right: "manage", requires: [] },
    { id: "inventory", max_right: "manage", requires: [] },
    { id: "shipping", max_right: "manage", requires: [] },
    { id: "followers", max_right: "view", requires: [] },
  ],
  templates: {
    [SellerRole.SUPPORT]: { orders: "view", returns: "view", products: "view", catalog: "view", followers: "view" },
  },
}

const Grant = (): ReactNode => {
  const permissions = useWatch<MemberPermissionsFormValues, "permissions">({ name: "permissions" })
  return <output data-testid="grant">{JSON.stringify(permissions)}</output>
}

const Harness = ({ roleId, permissions }: { roleId: string; permissions: MemberAreaPermissions }): ReactNode => {
  const form = useForm<MemberPermissionsFormValues>({ defaultValues: { role_id: roleId, permissions } })
  return (
    <FormProvider {...form}>
      <MemberPermissionsFields data={DATA} />
      <Grant />
    </FormProvider>
  )
}

const box = (area: string, right: string): HTMLElement =>
  screen.getByTestId(`member-permissions-row-${area}-${right}`)

const grant = (): MemberAreaPermissions => {
  try {
    return JSON.parse(screen.getByTestId("grant").textContent ?? "{}")
  } catch {
    return {}
  }
}

const isChecked = (element: HTMLElement): boolean => element.getAttribute("data-state") === "checked"

afterEach(cleanup)

describe("member permission checkboxes", () => {
  it("starts from the role template without a custom badge", () => {
    render(<Harness roleId={SellerRole.SUPPORT} permissions={templateFor(SellerRole.SUPPORT, DATA)} />)
    expect(isChecked(box("orders", "view"))).toBe(true)
    expect(isChecked(box("orders", "edit"))).toBe(false)
    expect(screen.queryByTestId("member-permissions-custom-badge")).toBeNull()
    expect(screen.queryByTestId("member-permissions-row-followers-edit")).toBeNull()
  })

  it("checks the lower boxes with a higher one and marks the grant custom", () => {
    render(<Harness roleId={SellerRole.SUPPORT} permissions={templateFor(SellerRole.SUPPORT, DATA)} />)
    fireEvent.click(box("returns", "manage"))
    expect(grant().returns).toBe("manage")
    expect(isChecked(box("returns", "edit"))).toBe(true)
    expect(screen.getByTestId("member-permissions-custom-badge")).toBeTruthy()
  })

  it("unchecks the higher boxes with a lower one", () => {
    render(<Harness roleId={SellerRole.SUPPORT} permissions={{ orders: "manage" }} />)
    fireEvent.click(box("orders", "view"))
    expect(grant().orders).toBeUndefined()
    expect(isChecked(box("orders", "manage"))).toBe(false)
  })

  it("checks and locks what another area needs", () => {
    render(<Harness roleId={SellerRole.SUPPORT} permissions={{}} />)
    fireEvent.click(box("products", "edit"))
    expect(grant()).toEqual({ products: "edit", catalog: "view", inventory: "view", shipping: "view" })
    expect(box("catalog", "view").hasAttribute("disabled")).toBe(true)
    expect(box("catalog", "edit").hasAttribute("disabled")).toBe(false)
    expect(screen.getByTestId("member-permissions-row-inventory-required")).toBeTruthy()

    fireEvent.click(box("returns", "view"))
    expect(grant().orders).toBe("view")
    expect(box("orders", "view").hasAttribute("disabled")).toBe(true)
  })

  it("locks every box for administration", () => {
    render(<Harness roleId={SellerRole.SELLER_ADMINISTRATION} permissions={templateFor(SellerRole.SELLER_ADMINISTRATION, DATA)} />)
    for (const area of DATA.areas) {
      expect(isChecked(box(area.id, area.max_right))).toBe(true)
      expect(box(area.id, "view").hasAttribute("disabled")).toBe(true)
    }
  })
})

describe("permissions payload", () => {
  it("sends nothing for administration, null for the template and the map otherwise", () => {
    expect(permissionsPayload(SellerRole.SELLER_ADMINISTRATION, { orders: "view" }, DATA)).toBeUndefined()
    expect(permissionsPayload(SellerRole.SUPPORT, templateFor(SellerRole.SUPPORT, DATA), DATA)).toBeNull()
    expect(permissionsPayload(SellerRole.SUPPORT, { orders: "view" }, DATA)).toEqual({ orders: "view" })
  })
})
