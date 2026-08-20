import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260816220000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "review_reply_image" ("id" text not null, "review_reply_id" text not null, "url" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_reply_image_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_reply_image_deleted_at" ON "review_reply_image" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_reply_image_review_reply_id" ON "review_reply_image" ("review_reply_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review_reply_image" cascade;`);
  }

}
