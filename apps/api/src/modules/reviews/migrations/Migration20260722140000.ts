import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260722140000 extends Migration {

  /**
   * Backfills the seller_review link for reviews written before the
   * create-review workflow started linking product reviews to their
   * product's seller(s) too (see resolve-review-seller-ids step). Without
   * this, reviews created before that change stay invisible to the vendor
   * panel and to the seller's aggregate rating even after the code fix,
   * since both are resolved through this same link table.
   */
  override async up(): Promise<void> {
    // Link tables are created after every module migration, so on an empty
    // database they do not exist yet — and there is nothing to backfill.
    this.addSql(`
      do $$
      begin
        if to_regclass('product_product_reviews_review') is not null
          and to_regclass('product_seller') is not null
          and to_regclass('seller_seller_reviews_review') is not null
        then
          insert into "seller_seller_reviews_review" ("id", "seller_id", "review_id", "created_at", "updated_at")
          select
            'link_' || upper(replace(gen_random_uuid()::text, '-', '')),
            ps."seller_id",
            pr."review_id",
            now(),
            now()
          from "product_product_reviews_review" pr
          join "product_seller" ps on ps."product_id" = pr."product_id" and ps."deleted_at" is null
          where pr."deleted_at" is null
            and not exists (
              select 1 from "seller_seller_reviews_review" sr
              where sr."seller_id" = ps."seller_id"
                and sr."review_id" = pr."review_id"
                and sr."deleted_at" is null
            );
        end if;
      end
      $$;
    `);
  }

  override async down(): Promise<void> {
    // Data-only backfill with no schema change — the inserted rows are
    // indistinguishable from links the app would have created on its own
    // afterward, so there is nothing safe to reverse here.
  }

}
