import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/framework/types"

import {
  adminHeaders,
  createAdminUser,
} from "../../../helpers/create-admin-user"

jest.setTimeout(120000)

type RouteCall = [method: "get" | "post" | "delete", path: string]

// Draft orders skip the seller split (no seller link, order group, commission
// or payout), so Kayı keeps every admin draft-order route closed.
const DRAFT_ORDER_ROUTES: RouteCall[] = [
  ["get", "/admin/draft-orders"],
  ["post", "/admin/draft-orders"],
  ["get", "/admin/draft-orders/order_1"],
  ["post", "/admin/draft-orders/order_1"],
  ["delete", "/admin/draft-orders/order_1"],
  ["post", "/admin/draft-orders/order_1/convert-to-order"],
  ["post", "/admin/draft-orders/order_1/edit"],
  ["delete", "/admin/draft-orders/order_1/edit"],
  ["post", "/admin/draft-orders/order_1/edit/items"],
  ["post", "/admin/draft-orders/order_1/edit/items/item/item_1"],
  ["post", "/admin/draft-orders/order_1/edit/items/act_1"],
  ["delete", "/admin/draft-orders/order_1/edit/items/act_1"],
  ["post", "/admin/draft-orders/order_1/edit/promotions"],
  ["delete", "/admin/draft-orders/order_1/edit/promotions"],
  ["post", "/admin/draft-orders/order_1/edit/shipping-methods"],
  ["post", "/admin/draft-orders/order_1/edit/shipping-methods/method/sm_1"],
  ["post", "/admin/draft-orders/order_1/edit/shipping-methods/act_1"],
  ["delete", "/admin/draft-orders/order_1/edit/shipping-methods/act_1"],
  ["post", "/admin/draft-orders/order_1/edit/request"],
  ["post", "/admin/draft-orders/order_1/edit/confirm"],
]

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer, dbConnection }) => {
    describe("admin draft orders are closed", () => {
      let container: MedusaContainer

      beforeAll(() => {
        container = getContainer()
      })

      beforeEach(async () => {
        await createAdminUser(dbConnection, adminHeaders, container)
      })

      it.each(DRAFT_ORDER_ROUTES)("%s %s answers 404", async (method, path) => {
        const request =
          method === "get" || method === "delete"
            ? api[method](path, adminHeaders)
            : api.post(path, {}, adminHeaders)
        const error = await request.catch((e) => e)
        expect(error.response?.status).toEqual(404)
      })
    })
  },
})
