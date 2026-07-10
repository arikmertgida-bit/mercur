import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260710070000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "seller_follower" ("id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_follower_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_follower_deleted_at" ON "seller_follower" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seller_follower" cascade;`);
  }

}
