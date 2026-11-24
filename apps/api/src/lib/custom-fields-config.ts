import type { CustomFieldsModuleOptions, Field } from '@mercurjs/types'

// Shared by apps/api/medusa-config.ts and integration-tests/medusa-config.ts so
// the test server runs with the same custom-field columns as production.

const REQUEST_FIELDS: Record<string, Field> = {
  request_status: {
    type: 'enum',
    enum: ['draft', 'pending', 'accepted', 'rejected'],
    defaultValue: 'draft',
  },
  submitter_id: { type: 'string', nullable: true },
  reviewer_id: { type: 'string', nullable: true },
  reviewer_note: { type: 'text', nullable: true },
}

export const KAYI_CUSTOM_FIELDS_OPTIONS: CustomFieldsModuleOptions = {
  customFields: {
    ProductCollection: REQUEST_FIELDS,
    ProductCategory: REQUEST_FIELDS,
    ProductType: REQUEST_FIELDS,
    ProductTag: REQUEST_FIELDS,
    ReturnReason: REQUEST_FIELDS,
    Return: {
      vendor_seen_at: { type: 'datetime', nullable: true },
    },
  },
}
