import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Data repair: `deleteReviewStep` previously soft-deleted the `review` row
 * without cleaning up its link pivot rows (customer_customer_reviews_review,
 * order_order_reviews_review, product_product_reviews_review,
 * seller_seller_reviews_review). An orphaned link row resolves to a null
 * `review` on any future traversal, which broke the storefront's
 * review-count/list consistency and crashed the customer's "written
 * reviews" list entirely (unfiltered null review in the response). The
 * step now cascades link cleanup via `link.delete()` for future deletions
 * — this migration soft-deletes the pivot rows already left behind by
 * reviews deleted before that fix shipped.
 */
export class Migration20260722170000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      update "customer_customer_reviews_review" ccr
      set "deleted_at" = now()
      where ccr."deleted_at" is null
        and not exists (
          select 1 from "review" r where r."id" = ccr."review_id" and r."deleted_at" is null
        );
    `);
    this.addSql(`
      update "order_order_reviews_review" oor
      set "deleted_at" = now()
      where oor."deleted_at" is null
        and not exists (
          select 1 from "review" r where r."id" = oor."review_id" and r."deleted_at" is null
        );
    `);
    this.addSql(`
      update "product_product_reviews_review" ppr
      set "deleted_at" = now()
      where ppr."deleted_at" is null
        and not exists (
          select 1 from "review" r where r."id" = ppr."review_id" and r."deleted_at" is null
        );
    `);
    this.addSql(`
      update "seller_seller_reviews_review" ssr
      set "deleted_at" = now()
      where ssr."deleted_at" is null
        and not exists (
          select 1 from "review" r where r."id" = ssr."review_id" and r."deleted_at" is null
        );
    `);
  }

  override async down(): Promise<void> {
    // Data repair only — not reversible (original deleted_at timestamps
    // for genuinely orphaned links are not recoverable).
  }

}
