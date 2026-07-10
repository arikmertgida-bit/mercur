import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260708094411 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "review_image_report" ("id" text not null, "review_image_id" text not null, "customer_id" text not null, "reason" text not null, "status" text check ("status" in ('pending', 'resolved')) not null default 'pending', "action_taken" text check ("action_taken" in ('hidden', 'published')) null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_image_report_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_image_report_deleted_at" ON "review_image_report" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review_image_report" cascade;`);
  }

}
