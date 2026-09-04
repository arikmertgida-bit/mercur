import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260904232828 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seller_low_stock_item" add column if not exists "thumbnail" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "seller_low_stock_item" drop column if exists "thumbnail";`);
  }

}
