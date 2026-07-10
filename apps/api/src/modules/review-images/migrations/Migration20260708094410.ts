import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260708094410 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "review_image" ("id" text not null, "review_id" text not null, "url" text not null, "is_hidden" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_image_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_image_deleted_at" ON "review_image" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review_image" cascade;`);
  }

}
