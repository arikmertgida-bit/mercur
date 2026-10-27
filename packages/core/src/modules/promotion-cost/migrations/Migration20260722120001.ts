import { Migration } from "@medusajs/framework/mikro-orm/migrations"

// Upstream ships this as Migration20260722120000 — the same name as Kayı's
// reviews module migration. Medusa records executed migrations by name in
// one shared mikro_orm_migrations table, so whichever ran second was
// silently skipped and promotion_cost was never created. Every statement
// below is idempotent, so the unique name is safe on databases that do
// already have the table.
export class Migration20260722120001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "promotion_cost" ("id" text not null, "promotion_id" text not null, "cost_bearer" text check ("cost_bearer" in ('store', 'marketplace', 'shared')) not null default 'store', "shared_marketplace_percentage" integer null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "promotion_cost_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_promotion_cost_promotion_id_unique" ON "promotion_cost" ("promotion_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_promotion_cost_deleted_at" ON "promotion_cost" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "promotion_cost" cascade;`)
  }
}
