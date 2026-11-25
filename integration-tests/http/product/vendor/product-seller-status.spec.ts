import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/framework/types"
import { MercurModules, SellerStatus } from "@mercurjs/types"

import { createSellerUser } from "../../../helpers/create-seller-user"
import { ensureVendorShippingProfile } from "../../../helpers/create-product"
import { createVendorProduct } from "../../../helpers/create-product"

jest.setTimeout(60000)

const EXPECTED = [
  {
    status: SellerStatus.PENDING_APPROVAL,
    code: "seller_pending_approval",
    en: "Your store is awaiting operator approval; you cannot perform this action until it is approved.",
    tr: "Mağazanız yönetici onayı bekliyor; onaylanana kadar bu işlemi yapamazsınız.",
  },
  {
    status: SellerStatus.SUSPENDED,
    code: "seller_suspended",
    en: "Your store has been suspended by the operator; you cannot perform this action.",
    tr: "Mağazanız platform yöneticisi tarafından askıya alındı; bu işlemi yapamazsınız.",
  },
  {
    status: SellerStatus.TERMINATED,
    code: "seller_terminated",
    en: "Your store has been permanently terminated by the operator; you cannot perform this action.",
    tr: "Mağazanız platform yöneticisi tarafından kalıcı olarak sonlandırıldı; bu işlemi yapamazsınız.",
  },
]

medusaIntegrationTestRunner({
  testSuite: ({ getContainer, api }) => {
    describe("Vendor - product writes by store status", () => {
      let appContainer: MedusaContainer

      beforeAll(() => {
        appContainer = getContainer()
      })

      const setStatus = async (sellerId: string, status: SellerStatus) => {
        const sellerModule: any = appContainer.resolve(MercurModules.SELLER)
        await sellerModule.updateSellers({ id: sellerId, status })
      }

      const withLanguage = (headers: any, language: string) => ({
        headers: { ...headers.headers, "accept-language": language },
      })

      const productBody = (title: string) => ({
        status: "published",
        title,
        variants: [{ title: "Default" }],
      })

      it("lets an open store create products", async () => {
        const { headers } = await createSellerUser(appContainer, {
          email: "status-open@test.com",
          name: "Status Open",
          autoApprove: true,
        })

        const response = await api.post(
          `/vendor/products`,
          {
            ...productBody("Open store product"),
            shipping_profile_id: await ensureVendorShippingProfile(api, headers),
          },
          headers
        )

        expect(response.status).toEqual(201)
      })

      it.each(EXPECTED)(
        "names the $status status, in English and Turkish",
        async ({ status, code, en, tr }) => {
          const { seller, headers } = await createSellerUser(appContainer, {
            email: `status-${status}@test.com`,
            name: `Status ${status}`,
            autoApprove: true,
          })
          const product = await createVendorProduct(api, headers, {
            title: `Existing ${status}`,
          })
          await setStatus(seller.id, status)

          const english = await api
            .post(`/vendor/products`, productBody("Blocked"), withLanguage(headers, "en"))
            .catch((e) => e.response)
          expect(english.status).toEqual(400)
          expect(english.data.code).toEqual(code)
          expect(english.data.message).toEqual(en)

          const turkish = await api
            .post(`/vendor/products`, productBody("Blocked"), withLanguage(headers, "tr"))
            .catch((e) => e.response)
          expect(turkish.status).toEqual(400)
          expect(turkish.data.code).toEqual(code)
          expect(turkish.data.message).toEqual(tr)

          const edit = await api
            .post(
              `/vendor/products/${product.id}`,
              { title: "Renamed" },
              withLanguage(headers, "tr")
            )
            .catch((e) => e.response)
          expect(edit.status).toEqual(400)
          expect(edit.data.code).toEqual(code)

          const removal = await api
            .delete(`/vendor/products/${product.id}`, withLanguage(headers, "tr"))
            .catch((e) => e.response)
          expect(removal.status).toEqual(400)
          expect(removal.data.code).toEqual(code)
        }
      )
    })
  },
})
