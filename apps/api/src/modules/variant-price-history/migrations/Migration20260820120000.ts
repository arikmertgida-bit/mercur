import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260820120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "variant_price_snapshot" ("id" text not null, "variant_id" text not null, "seller_id" text not null, "currency_code" text not null, "amount" numeric not null, "captured_date" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "variant_price_snapshot_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_variant_price_snapshot_deleted_at" ON "variant_price_snapshot" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_variant_price_snapshot_variant_id" ON "variant_price_snapshot" ("variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_variant_price_snapshot_seller_id" ON "variant_price_snapshot" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_variant_price_snapshot_variant_currency_date" ON "variant_price_snapshot" ("variant_id", "currency_code", "captured_date") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "variant_price_snapshot" cascade;`);
  }

}
