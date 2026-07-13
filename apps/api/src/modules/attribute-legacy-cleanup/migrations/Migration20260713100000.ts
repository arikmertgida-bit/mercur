import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Drops the tables left behind by the pre-2026-07 `attribute` and
 * `vendor_product_attribute` modules, both superseded by `product-attribute`
 * (`packages/core/src/modules/product-attribute`) during that period's
 * schema migration. Neither module exists in the source tree anymore
 * (confirmed: no `attribute`/`vendor-product-attribute` folder under
 * `packages/core/src/modules`, no live link definition references them —
 * `medusa db:sync-links`'s own plan flags all 6 pivot tables below as
 * `delete` actions). All 9 tables were confirmed empty (0 rows) before this
 * migration was written. Schema introspected from the live `kayi_db` via
 * `pg_dump --schema-only` before being written here, mirroring the
 * `offer-cleanup` module's migration pattern.
 */
export class Migration20260713100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`drop table if exists "product_product_category_attribute_attribute" cascade;`);
    this.addSql(`drop table if exists "product_product_attribute_attribute_value" cascade;`);
    this.addSql(`drop table if exists "product_vendor_product_attribute_vendor_product_a2192b2c26" cascade;`);
    this.addSql(`drop table if exists "seller_seller_attribute_attribute" cascade;`);
    this.addSql(`drop table if exists "seller_seller_attribute_attribute_value" cascade;`);
    this.addSql(`drop table if exists "seller_vendor_product_attribute_vendor_product_at4b404ff72" cascade;`);
    this.addSql(`drop table if exists "attribute_possible_value" cascade;`);
    this.addSql(`drop table if exists "attribute_value" cascade;`);
    this.addSql(`drop table if exists "attribute" cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`create table if not exists "attribute" ("id" text not null, "name" text not null, "description" text null, "handle" text not null, "metadata" jsonb null, "ui_component" text not null default 'select', "is_filterable" boolean not null default false, "is_required" boolean not null default false, "source" text not null default 'admin', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "attribute_pkey" primary key ("id"), constraint "attribute_ui_component_check" check ("ui_component" in ('select', 'multivalue', 'unit', 'toggle', 'text_area', 'color_picker')));`);
    this.addSql(`create index if not exists "IDX_attribute_deleted_at" on "attribute" ("deleted_at") where deleted_at is null;`);
    this.addSql(`create unique index if not exists "IDX_attribute_handle_unique" on "attribute" ("handle") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_attribute_source_name" on "attribute" ("source", "name") where deleted_at is null;`);

    this.addSql(`create table if not exists "attribute_value" ("id" text not null, "value" text not null, "rank" integer not null, "metadata" jsonb null, "source" text not null default 'admin', "attribute_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "attribute_value_pkey" primary key ("id"), constraint "attribute_value_attribute_id_foreign" foreign key ("attribute_id") references "attribute" ("id") on update cascade on delete cascade);`);
    this.addSql(`create index if not exists "IDX_attribute_value_attribute_id" on "attribute_value" ("attribute_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_attribute_value_attribute_source" on "attribute_value" ("attribute_id", "source") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_attribute_value_deleted_at" on "attribute_value" ("deleted_at") where deleted_at is null;`);

    this.addSql(`create table if not exists "attribute_possible_value" ("id" text not null, "value" text not null, "rank" integer not null, "metadata" jsonb null, "attribute_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "attribute_possible_value_pkey" primary key ("id"), constraint "attribute_possible_value_attribute_id_foreign" foreign key ("attribute_id") references "attribute" ("id") on update cascade on delete cascade);`);
    this.addSql(`create index if not exists "IDX_attribute_possible_value_attribute_id" on "attribute_possible_value" ("attribute_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_attribute_possible_value_deleted_at" on "attribute_possible_value" ("deleted_at") where deleted_at is null;`);
    this.addSql(`create unique index if not exists "UQ_attribute_id_value" on "attribute_possible_value" ("attribute_id", "value") where deleted_at is null;`);

    this.addSql(`create table if not exists "product_product_category_attribute_attribute" ("product_category_id" varchar(255) not null, "attribute_id" varchar(255) not null, "id" varchar(255) not null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, "deleted_at" timestamptz null, constraint "product_product_category_attribute_attribute_pkey" primary key ("product_category_id", "attribute_id"));`);
    this.addSql(`create index if not exists "IDX_attribute_id_1ed865a09" on "product_product_category_attribute_attribute" ("attribute_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_deleted_at_1ed865a09" on "product_product_category_attribute_attribute" ("deleted_at");`);
    this.addSql(`create index if not exists "IDX_id_1ed865a09" on "product_product_category_attribute_attribute" ("id");`);
    this.addSql(`create index if not exists "IDX_product_category_id_1ed865a09" on "product_product_category_attribute_attribute" ("product_category_id") where deleted_at is null;`);

    this.addSql(`create table if not exists "product_product_attribute_attribute_value" ("product_id" varchar(255) not null, "attribute_value_id" varchar(255) not null, "id" varchar(255) not null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, "deleted_at" timestamptz null, constraint "product_product_attribute_attribute_value_pkey" primary key ("product_id", "attribute_value_id"));`);
    this.addSql(`create index if not exists "IDX_attribute_value_id_24ad8b4e8" on "product_product_attribute_attribute_value" ("attribute_value_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_deleted_at_24ad8b4e8" on "product_product_attribute_attribute_value" ("deleted_at");`);
    this.addSql(`create index if not exists "IDX_id_24ad8b4e8" on "product_product_attribute_attribute_value" ("id");`);
    this.addSql(`create index if not exists "IDX_product_id_24ad8b4e8" on "product_product_attribute_attribute_value" ("product_id") where deleted_at is null;`);

    this.addSql(`create table if not exists "product_vendor_product_attribute_vendor_product_a2192b2c26" ("product_id" varchar(255) not null, "vendor_product_attribute_id" varchar(255) not null, "id" varchar(255) not null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, "deleted_at" timestamptz null, constraint "product_vendor_product_attribute_vendor_product_a2192b2c26_pkey" primary key ("product_id", "vendor_product_attribute_id"));`);
    this.addSql(`create index if not exists "IDX_deleted_at_2192b2c26" on "product_vendor_product_attribute_vendor_product_a2192b2c26" ("deleted_at");`);
    this.addSql(`create index if not exists "IDX_id_2192b2c26" on "product_vendor_product_attribute_vendor_product_a2192b2c26" ("id");`);
    this.addSql(`create index if not exists "IDX_product_id_2192b2c26" on "product_vendor_product_attribute_vendor_product_a2192b2c26" ("product_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_vendor_product_attribute_id_2192b2c26" on "product_vendor_product_attribute_vendor_product_a2192b2c26" ("vendor_product_attribute_id") where deleted_at is null;`);

    this.addSql(`create table if not exists "seller_seller_attribute_attribute" ("seller_id" varchar(255) not null, "attribute_id" varchar(255) not null, "id" varchar(255) not null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, "deleted_at" timestamptz null, constraint "seller_seller_attribute_attribute_pkey" primary key ("seller_id", "attribute_id"));`);
    this.addSql(`create index if not exists "IDX_attribute_id_fcea5758" on "seller_seller_attribute_attribute" ("attribute_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_deleted_at_fcea5758" on "seller_seller_attribute_attribute" ("deleted_at");`);
    this.addSql(`create index if not exists "IDX_id_fcea5758" on "seller_seller_attribute_attribute" ("id");`);
    this.addSql(`create index if not exists "IDX_seller_id_fcea5758" on "seller_seller_attribute_attribute" ("seller_id") where deleted_at is null;`);

    this.addSql(`create table if not exists "seller_seller_attribute_attribute_value" ("seller_id" varchar(255) not null, "attribute_value_id" varchar(255) not null, "id" varchar(255) not null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, "deleted_at" timestamptz null, constraint "seller_seller_attribute_attribute_value_pkey" primary key ("seller_id", "attribute_value_id"));`);
    this.addSql(`create index if not exists "IDX_attribute_value_id_-14c31bcc" on "seller_seller_attribute_attribute_value" ("attribute_value_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_deleted_at_-14c31bcc" on "seller_seller_attribute_attribute_value" ("deleted_at");`);
    this.addSql(`create index if not exists "IDX_id_-14c31bcc" on "seller_seller_attribute_attribute_value" ("id");`);
    this.addSql(`create index if not exists "IDX_seller_id_-14c31bcc" on "seller_seller_attribute_attribute_value" ("seller_id") where deleted_at is null;`);

    this.addSql(`create table if not exists "seller_vendor_product_attribute_vendor_product_at4b404ff72" ("seller_id" varchar(255) not null, "vendor_product_attribute_id" varchar(255) not null, "id" varchar(255) not null, "created_at" timestamptz not null default current_timestamp, "updated_at" timestamptz not null default current_timestamp, "deleted_at" timestamptz null, constraint "seller_vendor_product_attribute_vendor_product_at4b404ff72_pkey" primary key ("seller_id", "vendor_product_attribute_id"));`);
    this.addSql(`create index if not exists "IDX_deleted_at_4b404ff72" on "seller_vendor_product_attribute_vendor_product_at4b404ff72" ("deleted_at");`);
    this.addSql(`create index if not exists "IDX_id_4b404ff72" on "seller_vendor_product_attribute_vendor_product_at4b404ff72" ("id");`);
    this.addSql(`create index if not exists "IDX_seller_id_4b404ff72" on "seller_vendor_product_attribute_vendor_product_at4b404ff72" ("seller_id") where deleted_at is null;`);
    this.addSql(`create index if not exists "IDX_vendor_product_attribute_id_4b404ff72" on "seller_vendor_product_attribute_vendor_product_at4b404ff72" ("vendor_product_attribute_id") where deleted_at is null;`);
  }
}
