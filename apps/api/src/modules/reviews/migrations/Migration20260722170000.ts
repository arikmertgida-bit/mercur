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
const REVIEW_LINK_TABLES = [
  "customer_customer_reviews_review",
  "order_order_reviews_review",
  "product_product_reviews_review",
  "seller_seller_reviews_review",
] as const;

export class Migration20260722170000 extends Migration {

  override async up(): Promise<void> {
    // Link tables are created after every module migration, so on an empty
    // database they do not exist yet — and there are no orphans to repair.
    for (const linkTable of REVIEW_LINK_TABLES) {
      this.addSql(`
        do $$
        begin
          if to_regclass('${linkTable}') is not null then
            update "${linkTable}" l
            set "deleted_at" = now()
            where l."deleted_at" is null
              and not exists (
                select 1 from "review" r where r."id" = l."review_id" and r."deleted_at" is null
              );
          end if;
        end
        $$;
      `);
    }
  }

  override async down(): Promise<void> {
    // Data repair only — not reversible (original deleted_at timestamps
    // for genuinely orphaned links are not recoverable).
  }

}
