import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Deletes 4 leftover `price` rows (and their cascading `price_rule` rows)
 * that were scoped to deleted offers via a `price_rule.attribute = 'offer_id'`
 * rule. Each of these `price` rows was the *only* price in its `price_set`,
 * and each `price_set` belongs to a `product_variant` that is itself
 * soft-deleted — so no live variant loses a real default price by this
 * deletion. Both `price` and `price_rule` are removed together: dropping
 * only the rule would turn the row into an unscoped "default" price that
 * could start being matched incorrectly.
 */
export class Migration20260712120000 extends Migration {
  private readonly priceIds = [
    "price_01KX5YM1GW0PEH1YF08RGKFZ7A",
    "price_01KX9QKPB9BPWS1KYCJWSMA3MG",
    "price_01KXA166HWQSASJZ38Q40SQ27V",
    "price_01KXA31APGNQ8YJWRH97MS5GD6",
  ];

  // Guarded on the table's existence: this migration targets 4 specific rows
  // left over from this deployment's own production database at the time the
  // offer module was removed. A fresh database (new environment, integration
  // tests) never has the `price` table populated with these rows — in some
  // module-load orderings it may not even have the `price` table yet — so the
  // delete must no-op rather than fail the whole migration chain.
  override async up(): Promise<void> {
    this.addSql(
      `do $$ begin
        if to_regclass('public.price') is not null then
          delete from "price" where "id" in (${this.priceIds.map((id) => `'${id}'`).join(", ")});
        end if;
      end $$;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `insert into "price" ("id", "title", "price_set_id", "currency_code", "raw_amount", "rules_count", "price_list_id", "amount", "min_quantity", "max_quantity", "raw_min_quantity", "raw_max_quantity", "created_at", "updated_at") values
        ('price_01KX5YM1GW0PEH1YF08RGKFZ7A', null, 'pset_01KX5Y4FKYMF7EGE10C7KYZ78J', 'eur', '{"value": "250", "precision": 20}', 1, null, 250, null, null, null, null, '2026-07-10 12:04:16.021054+00', '2026-07-11 23:19:57.827+00'),
        ('price_01KX9QKPB9BPWS1KYCJWSMA3MG', null, 'pset_01KX9QJ3D3KW0ZVGVXECGCFTBN', 'eur', '{"value": "250", "precision": 20}', 1, null, 250, null, null, null, null, '2026-07-11 23:18:42.274628+00', '2026-07-12 02:11:29.181+00'),
        ('price_01KXA166HWQSASJZ38Q40SQ27V', null, 'pset_01KXA15GM7WKC2CX2ARGN95T20', 'eur', '{"value": "2111", "precision": 20}', 1, null, 2111, null, null, null, null, '2026-07-12 02:06:05.877703+00', '2026-07-12 08:19:04.798+00'),
        ('price_01KXA31APGNQ8YJWRH97MS5GD6', null, 'pset_01KXA2YE4EZNB6WSCG9CYJ6RGQ', 'try', '{"value": "4444", "precision": 20}', 1, null, 4444, null, null, null, null, '2026-07-12 02:38:23.435591+00', '2026-07-12 08:19:09.357+00');`
    );
    this.addSql(
      `insert into "price_rule" ("id", "value", "priority", "price_id", "attribute", "operator", "created_at", "updated_at") values
        ('prule_01KX5YM1H037Y5TJS6WFWBF036', 'offer_01KX5YM1FZZF29RDCJ0VCCYFGF', 0, 'price_01KX5YM1GW0PEH1YF08RGKFZ7A', 'offer_id', 'eq', '2026-07-10 12:04:16.021054+00', '2026-07-11 23:19:57.831+00'),
        ('prule_01KX9QKPBGJ1ZDS0FH4J56ET41', 'offer_01KX9QKPAKH0YP5JBY1BD1YDSS', 0, 'price_01KX9QKPB9BPWS1KYCJWSMA3MG', 'offer_id', 'eq', '2026-07-11 23:18:42.274628+00', '2026-07-12 02:11:29.186+00'),
        ('prule_01KXA166J15MMBPPB7NF4A63BP', 'offer_01KXA166H8VXR78XGK0A98S327', 0, 'price_01KXA166HWQSASJZ38Q40SQ27V', 'offer_id', 'eq', '2026-07-12 02:06:05.877703+00', '2026-07-12 08:19:04.802+00'),
        ('prule_01KXA31APKTV46CC89RQT7Z3GA', 'offer_01KXA31ANWHB6C0NS5JG809WGC', 0, 'price_01KXA31APGNQ8YJWRH97MS5GD6', 'offer_id', 'eq', '2026-07-12 02:38:23.435591+00', '2026-07-12 08:19:09.36+00');`
    );
  }
}
