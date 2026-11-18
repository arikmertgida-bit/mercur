import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261119120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `ALTER TABLE "seller_member" ADD COLUMN IF NOT EXISTS "custom_permissions" jsonb NULL;`,
    )
    this.addSql(
      `ALTER TABLE "member_invite" ADD COLUMN IF NOT EXISTS "custom_permissions" jsonb NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `ALTER TABLE "seller_member" DROP COLUMN IF EXISTS "custom_permissions";`,
    )
    this.addSql(
      `ALTER TABLE "member_invite" DROP COLUMN IF EXISTS "custom_permissions";`,
    )
  }
}
