import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Database-level second defense against inventory oversell, independent of
 * the Redis lock that `reserveInventoryStep` / `createReservationsStep`
 * take: `@medusajs/inventory`'s reservation write is a read-then-write, so
 * two concurrent reservations on a stock=1 item can both succeed if that
 * lock is ever lost. The trigger locks the targeted `inventory_level` row
 * and compares the live sum of `reservation_item.quantity` with
 * `stocked_quantity`.
 *
 * A migration script, not a module migration: it targets the inventory
 * module's tables, and `db:migrate` runs every module's migrations
 * (this project's own before Medusa's) and only then the scripts — a module
 * migration here failed on an empty database because `reservation_item`
 * did not exist yet. Every statement is idempotent, so a database that
 * already has the guard from the former module migration is unaffected.
 */
const GUARD_STATEMENTS = [
  `create index if not exists "idx_kayi_reservation_item_item_location"
    on "reservation_item" ("inventory_item_id", "location_id")
    where "deleted_at" is null;`,
  `create or replace function fn_enforce_reservation_limit() returns trigger as $$
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
  $$ language plpgsql;`,
  `create or replace trigger trg_enforce_reservation_limit
    after insert on "reservation_item"
    for each row execute function fn_enforce_reservation_limit();`,
]

export default async function installReservationOversellGuard({
  container,
}: ExecArgs): Promise<void> {
  const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  await pgConnection.transaction(async (trx) => {
    for (const statement of GUARD_STATEMENTS) {
      await trx.raw(statement)
    }
  })
}
