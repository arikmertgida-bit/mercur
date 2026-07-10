import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260708082017 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_report" ("id" text not null, "product_id" text not null, "customer_id" text not null, "reason" text not null, "comment" text not null, "status" text check ("status" in ('pending', 'resolved', 'dismissed')) not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_report_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_product_report_product_id" ON "product_report" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_product_report_customer_id" ON "product_report" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_product_report_status" ON "product_report" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_report_deleted_at" ON "product_report" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_report" cascade;`);
  }

}
