import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260903100000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "seller_daily_stat" ("id" text not null, "seller_id" text not null, "date" text not null, "currency_code" text not null, "orders_count" integer not null, "gross_revenue" numeric not null, "raw_gross_revenue" jsonb not null, "net_earnings" numeric not null, "raw_net_earnings" jsonb not null, "computed_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_daily_stat_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_daily_stat_deleted_at" ON "seller_daily_stat" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_daily_stat_seller_id" ON "seller_daily_stat" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_daily_stat_seller_date_currency" ON "seller_daily_stat" ("seller_id", "date", "currency_code") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "seller_low_stock_item" ("id" text not null, "seller_id" text not null, "inventory_item_id" text not null, "product_title" text not null, "sku" text null, "available_quantity" integer not null, "computed_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_low_stock_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_low_stock_item_deleted_at" ON "seller_low_stock_item" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_low_stock_item_seller_id" ON "seller_low_stock_item" ("seller_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "platform_daily_stat" ("id" text not null, "date" text not null, "currency_code" text not null, "orders_count" integer not null, "gross_revenue" numeric not null, "raw_gross_revenue" jsonb not null, "commission_earnings" numeric not null, "raw_commission_earnings" jsonb not null, "total_products" integer not null, "total_sellers" integer not null, "total_customers" integer not null, "computed_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "platform_daily_stat_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_platform_daily_stat_deleted_at" ON "platform_daily_stat" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_platform_daily_stat_date_currency" ON "platform_daily_stat" ("date", "currency_code") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seller_daily_stat" cascade;`);
    this.addSql(`drop table if exists "seller_low_stock_item" cascade;`);
    this.addSql(`drop table if exists "platform_daily_stat" cascade;`);
  }

}
