import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260722120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "review" add column if not exists "reference_id" text null;`);

    // Backfill from the link tables so existing reviews keep working —
    // the link tables remain the source of truth for cross-module joins,
    // this column is a denormalized copy for plain reads.
    this.addSql(`
      update "review" r
      set "reference_id" = p."product_id"
      from "product_product_reviews_review" p
      where p."review_id" = r."id" and p."deleted_at" is null and r."reference_id" is null;
    `);
    this.addSql(`
      update "review" r
      set "reference_id" = s."seller_id"
      from "seller_seller_reviews_review" s
      where s."review_id" = r."id" and s."deleted_at" is null and r."reference_id" is null;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "review" drop column if exists "reference_id";`);
  }

}
