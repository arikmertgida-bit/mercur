import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260905120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_group" drop constraint if exists "order_group_cart_id_unique";`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_group_cart_id_unique" ON "order_group" ("cart_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_order_group_cart_id_unique";`);
  }

}
