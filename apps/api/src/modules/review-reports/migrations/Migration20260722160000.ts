import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260722160000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "review_report" ("id" text not null, "review_id" text not null, "seller_id" text not null, "reason" text not null, "status" text check ("status" in ('pending', 'resolved_deleted', 'resolved_kept')) not null default 'pending', "admin_note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_report_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_report_deleted_at" ON "review_report" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_report_review_id" ON "review_report" ("review_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_report_seller_id" ON "review_report" ("seller_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review_report" cascade;`);
  }

}
