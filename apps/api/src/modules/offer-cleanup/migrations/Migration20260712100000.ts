import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Drops the tables left behind by the removed `offer` module and its
 * module links (cart line item ↔ offer, order line item ↔ offer, offer ↔
 * inventory item, offer ↔ pricing price). The module itself, its workflows,
 * API routes, and link definitions were already removed from the source
 * tree — this migration is the corresponding schema teardown, introspected
 * from the live `kayi_db` schema before being written.
 */
export class Migration20260712100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`drop table if exists "cart_line_item_offer_offer" cascade;`);
    this.addSql(`drop table if exists "order_order_line_item_offer_offer" cascade;`);
    this.addSql(`drop table if exists "offer_offer_pricing_price" cascade;`);
    this.addSql(`drop table if exists "offer_inventory_item" cascade;`);
    this.addSql(`drop table if exists "offer" cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`create table if not exists "offer" ("id" text not null, "seller_id" text not null, "variant_id" text not null, "shipping_profile_id" text not null, "sku" text not null, "ean" text null, "upc" text null, "created_by" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, "product_id" text not null default '', constraint "offer_pkey" primary key ("id"));`);
    this.addSql(`create index if not exists "IDX_offer_deleted_at" on "offer" ("deleted_at") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_offer_ean" on "offer" ("ean") where deleted_at is null and ean is not null;`);
    this.addSql(`create index if not exists "IDX_offer_product_id" on "offer" ("product_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_offer_seller_id" on "offer" ("seller_id") where deleted_at is null;`);
    this.addSql(`create unique index if not exists "IDX_offer_seller_sku_unique" on "offer" ("seller_id", "sku") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_offer_shipping_profile_id" on "offer" ("shipping_profile_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_offer_upc" on "offer" ("upc") where deleted_at is null and upc is not null;`);
    this.addSql(`create index if not exists "IDX_offer_variant_id" on "offer" ("variant_id") where deleted_at is null;`);

    this.addSql(`create table if not exists "offer_inventory_item" ("offer_id" varchar(255) not null, "inventory_item_id" varchar(255) not null, "id" varchar(255) not null, "required_quantity" integer not null default 1, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, "deleted_at" timestamptz null, constraint "offer_inventory_item_pkey" primary key ("offer_id", "inventory_item_id"));`);
    this.addSql(`create index if not exists "IDX_deleted_at_169ccbc72" on "offer_inventory_item" ("deleted_at");`);
    this.addSql(`create index if not exists "IDX_id_169ccbc72" on "offer_inventory_item" ("id");`);
    this.addSql(`create index if not exists "IDX_inventory_item_id_169ccbc72" on "offer_inventory_item" ("inventory_item_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_offer_id_169ccbc72" on "offer_inventory_item" ("offer_id") where deleted_at is null;`);

    this.addSql(`create table if not exists "offer_offer_pricing_price" ("offer_id" varchar(255) not null, "price_id" varchar(255) not null, "id" varchar(255) not null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, "deleted_at" timestamptz null, constraint "offer_offer_pricing_price_pkey" primary key ("offer_id", "price_id"));`);
    this.addSql(`create index if not exists "IDX_deleted_at_1c99f363b" on "offer_offer_pricing_price" ("deleted_at");`);
    this.addSql(`create index if not exists "IDX_id_1c99f363b" on "offer_offer_pricing_price" ("id");`);
    this.addSql(`create index if not exists "IDX_offer_id_1c99f363b" on "offer_offer_pricing_price" ("offer_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_price_id_1c99f363b" on "offer_offer_pricing_price" ("price_id") where deleted_at is null;`);

    this.addSql(`create table if not exists "cart_line_item_offer_offer" ("line_item_id" varchar(255) not null, "offer_id" varchar(255) not null, "id" varchar(255) not null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, "deleted_at" timestamptz null, constraint "cart_line_item_offer_offer_pkey" primary key ("line_item_id", "offer_id"));`);
    this.addSql(`create index if not exists "IDX_deleted_at_1ec91615a" on "cart_line_item_offer_offer" ("deleted_at");`);
    this.addSql(`create index if not exists "IDX_id_1ec91615a" on "cart_line_item_offer_offer" ("id");`);
    this.addSql(`create index if not exists "IDX_line_item_id_1ec91615a" on "cart_line_item_offer_offer" ("line_item_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_offer_id_1ec91615a" on "cart_line_item_offer_offer" ("offer_id") where deleted_at is null;`);

    this.addSql(`create table if not exists "order_order_line_item_offer_offer" ("order_line_item_id" varchar(255) not null, "offer_id" varchar(255) not null, "id" varchar(255) not null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, "deleted_at" timestamptz null, constraint "order_order_line_item_offer_offer_pkey" primary key ("order_line_item_id", "offer_id"));`);
    this.addSql(`create index if not exists "IDX_deleted_at_fa551633" on "order_order_line_item_offer_offer" ("deleted_at");`);
    this.addSql(`create index if not exists "IDX_id_fa551633" on "order_order_line_item_offer_offer" ("id");`);
    this.addSql(`create index if not exists "IDX_offer_id_fa551633" on "order_order_line_item_offer_offer" ("offer_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_order_line_item_id_fa551633" on "order_order_line_item_offer_offer" ("order_line_item_id") where deleted_at is null;`);
  }
}
