import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Second, DB-native defense layer against inventory oversell — independent
 * of the Redis-backed distributed lock `reserveInventoryStep` /
 * `createReservationsStep` already wrap every reservation write in
 * (`Modules.LOCKING` -> `locking-redis`). That lock is the only thing
 * preventing a lost-update race in `@medusajs/inventory`'s
 * `createReservationItems_` (a plain read-then-write, not an atomic SQL
 * compare-and-set): two concurrent reservations on a stock=1 item can each
 * read `reserved_quantity=0`, each write an absolute `1`, and both succeed —
 * two live `reservation_item` rows against one unit of stock — if Redis is
 * ever unavailable or a network blip drops the lock.
 *
 * This migration adds a trigger that closes the same race at the database
 * level, with no dependency on Redis: `fn_enforce_reservation_limit()`
 * takes `SELECT ... FOR UPDATE` on the exact `inventory_level` row a new
 * reservation targets, which forces true serial execution of concurrent
 * inserts against that row regardless of whether the app-level lock was
 * held, then compares the live sum of non-deleted `reservation_item.quantity`
 * for that (inventory_item_id, location_id) against `stocked_quantity` — the
 * real source of truth, not `inventory_level.reserved_quantity` itself,
 * since that counter is exactly what the lost-update race under-counts.
 *
 * Deliberately does not touch `@medusajs/inventory`'s vendored source: the
 * guard lives entirely in this project's own schema/migration, so it
 * survives every upstream `kayi-main` rebase untouched.
 */
export class Migration20260904120000 extends Migration {
  override async up(): Promise<void> {
    // Covering index for the trigger's SUM — doesn't exist yet (only single
    // -column indexes on inventory_item_id and location_id do), and without
    // it the per-insert SUM would degrade at scale.
    this.addSql(
      `create index if not exists "idx_kayi_reservation_item_item_location"
        on "reservation_item" ("inventory_item_id", "location_id")
        where "deleted_at" is null;`
    );

    this.addSql(`
      create or replace function fn_enforce_reservation_limit() returns trigger as $$
      declare
        v_stocked numeric;
        v_reserved_total numeric;
      begin
        select "stocked_quantity" into v_stocked
          from "inventory_level"
          where "inventory_item_id" = new."inventory_item_id"
            and "location_id" = new."location_id"
          for update;

        select coalesce(sum("quantity"), 0) into v_reserved_total
          from "reservation_item"
          where "inventory_item_id" = new."inventory_item_id"
            and "location_id" = new."location_id"
            and "deleted_at" is null;

        if not new."allow_backorder"
          and v_stocked is not null
          and v_reserved_total > v_stocked
        then
          raise exception 'INVENTORY_OVERSELL_BLOCKED: item % at % would exceed stock (% > %)',
            new."inventory_item_id", new."location_id", v_reserved_total, v_stocked
            using errcode = 'P0001';
        end if;

        return new;
      end;
      $$ language plpgsql;
    `);

    this.addSql(`
      create trigger trg_enforce_reservation_limit
        after insert on "reservation_item"
        for each row execute function fn_enforce_reservation_limit();
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop trigger if exists trg_enforce_reservation_limit on "reservation_item";`);
    this.addSql(`drop function if exists fn_enforce_reservation_limit();`);
    this.addSql(`drop index if exists "idx_kayi_reservation_item_item_location";`);
  }
}
