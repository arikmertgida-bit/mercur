export const vendorReviewReportFields = [
  "id",
  "review_id",
  "seller_id",
  "reason",
  "status",
  "admin_note",
  "created_at",
  "updated_at",
];

export const vendorReviewReportQueryConfig = {
  list: {
    defaults: vendorReviewReportFields,
    defaultLimit: 20,
    isList: true,
  },
};
