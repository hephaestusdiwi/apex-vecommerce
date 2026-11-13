import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Menambah nilai role `customer`. Dipisah dari migrasi berikutnya karena Postgres tidak mengizinkan nilai enum
 * baru dipakai (mis. sebagai default kolom) dalam transaksi yang sama dengan ADD VALUE.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TYPE "public"."enum_users_role" ADD VALUE IF NOT EXISTS 'customer';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Postgres tidak bisa menghapus satu nilai enum. Dibiarkan: nilai yang tidak terpakai tidak berbahaya.
  void db
}
