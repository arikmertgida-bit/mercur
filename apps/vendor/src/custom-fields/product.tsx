import { defineCustomFieldsConfig } from "@mercurjs/dashboard-sdk";
import { Text } from "@medusajs/ui";

// ERP entegrasyonu askıya alındı (bkz. proje notları) — dış firma kendi
// entegrasyon kodunu getirene kadar aşağıdaki ERP ID alanı tamamen devre
// dışı. Silinmedi, sadece yorum satırına alındı; geri açmak için bu
// dosyadaki yorumları kaldırmak yeterli.
// import { createFormHelper } from "@mercurjs/dashboard-shared";
// type ProductWithMeta = { metadata?: Record<string, unknown> };
// const form = createFormHelper<ProductWithMeta>();
// const erpId = (data: ProductWithMeta) =>
//   (data?.metadata?.erp_id as string) ?? "-";

export default defineCustomFieldsConfig({
  model: "product",
  link: "brand",
  forms: [
    // ERP ID — ürün düzenleme formundaki alan (devre dışı)
    // {
    //   zone: "edit",
    //   fields: {
    //     erp_id: form.define({
    //       validation: form.string().optional(),
    //       label: "ERP ID",
    //       description: "External system identifier",
    //       placeholder: "ERP-000",
    //       defaultValue: (data: ProductWithMeta) =>
    //         (data?.metadata?.erp_id as string) ?? "",
    //     }),
    //   },
    // },
  ],
  displays: [
    {
      zone: "general",
      fields: [
        // ERP ID — ürün detay sayfasının Genel bölümündeki satır (devre dışı)
        // {
        //   id: "erp_id",
        //   component: ({ data }) => (
        //     <Text size="small" className="text-ui-fg-subtle px-6 py-4">
        //       ERP ID: {erpId(data as ProductWithMeta)}
        //     </Text>
        //   ),
        // },
        // REMOVE — built-in id + null hides the field
        { id: "subtitle", component: null },
        // REPLACE — built-in id + component overrides its render
        {
          id: "handle",
          component: ({ data }) => (
            <Text size="small" className="text-ui-fg-subtle px-6 py-4">
              /{(data as { handle?: string })?.handle}
            </Text>
          ),
        },
      ],
    },
  ],
  list: {
    // ERP ID — ürün listesi tablosundaki "ERP" sütunu (devre dışı)
    columns: [
      // { id: "erp_id", header: "ERP", component: ({ row }) => erpId(row as ProductWithMeta) },
    ],
    viewDefaults: {
      columnVisibility: { collection: false }, // HIDE the built-in collection column
      // columnOrder: ["product", "erp_id", "status"], // ERP sütunu devre dışı bırakıldığı için sıralama da askıya alındı
    },
  },
});
