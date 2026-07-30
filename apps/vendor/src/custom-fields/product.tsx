import { defineCustomFieldsConfig } from "@mercurjs/dashboard-sdk";
import { Text } from "@medusajs/ui";

// ERP integration is on hold (see project notes) — the ERP ID field below is
// fully disabled until the external vendor delivers its own integration code.
// Not deleted, only commented out; uncommenting these lines is enough to
// re-enable it.
// import { createFormHelper } from "@mercurjs/dashboard-shared";
// type ProductWithMeta = { metadata?: Record<string, unknown> };
// const form = createFormHelper<ProductWithMeta>();
// const erpId = (data: ProductWithMeta) =>
//   (data?.metadata?.erp_id as string) ?? "-";

export default defineCustomFieldsConfig({
  model: "product",
  link: "brand",
  forms: [
    // ERP ID — field in the product edit form (disabled)
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
        // ERP ID — row in the product detail page's General section (disabled)
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
    // ERP ID — "ERP" column in the product list table (disabled)
    columns: [
      // { id: "erp_id", header: "ERP", component: ({ row }) => erpId(row as ProductWithMeta) },
    ],
    viewDefaults: {
      columnVisibility: { collection: false }, // HIDE the built-in collection column
      // columnOrder: ["product", "erp_id", "status"], // column order is on hold too since the ERP column is disabled
    },
  },
});
