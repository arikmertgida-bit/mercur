import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260717200000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "review_reply" ("id" text not null, "review_id" text not null, "content" text not null, "is_seller_reply" boolean not null default false, "customer_id" text null, "seller_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_reply_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_reply_deleted_at" ON "review_reply" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_reply_review_id" ON "review_reply" ("review_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "review_like" ("id" text not null, "review_id" text not null, "customer_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_like_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_like_deleted_at" ON "review_like" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_review_like_review_customer_unique" ON "review_like" ("review_id", "customer_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "review_reply_like" ("id" text not null, "reply_id" text not null, "customer_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_reply_like_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_reply_like_deleted_at" ON "review_reply_like" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_review_reply_like_reply_customer_unique" ON "review_reply_like" ("reply_id", "customer_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review_reply_like" cascade;`);
    this.addSql(`drop table if exists "review_like" cascade;`);
    this.addSql(`drop table if exists "review_reply" cascade;`);
  }

}
