import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** Step 1 toko: role customer, kolom telepon user, dan tabel alamat. Hanya penambahan; data lama tidak diubah. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE "addresses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer NOT NULL,
  	"label" varchar DEFAULT 'Rumah',
  	"recipient_name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"line1" varchar NOT NULL,
  	"line2" varchar,
  	"district" varchar,
  	"city" varchar NOT NULL,
  	"province" varchar NOT NULL,
  	"postal_code" varchar NOT NULL,
  	"is_default" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer';
  ALTER TABLE "users" ADD COLUMN "phone" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "addresses_id" integer;
  ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "addresses_customer_idx" ON "addresses" USING btree ("customer_id");
  CREATE INDEX "addresses_updated_at_idx" ON "addresses" USING btree ("updated_at");
  CREATE INDEX "addresses_created_at_idx" ON "addresses" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_addresses_fk" FOREIGN KEY ("addresses_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_addresses_id_idx" ON "payload_locked_documents_rels" USING btree ("addresses_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "addresses" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "addresses" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_addresses_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_addresses_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "addresses_id";
  ALTER TABLE "users" DROP COLUMN "phone";
  -- Nilai enum 'customer' tidak bisa dihapus oleh Postgres selain dengan membuat ulang tipe; bila sudah ada
  -- akun customer, pulihkan dari backup. Default role dikembalikan ke 'editor'.
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor';`)
}
