export const adminReviewReportFields = [
  "id",
  "review_id",
  "seller_id",
  "reason",
  "status",
  "admin_note",
  "created_at",
  "updated_at",
];

export const adminReviewReportQueryConfig = {
  list: {
    defaults: adminReviewReportFields,
    defaultLimit: 20,
    isList: true,
  },
  retrieve: {
    defaults: adminReviewReportFields,
    isList: false,
  },
};
