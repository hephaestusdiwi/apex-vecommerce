import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** Keep payment columns that exist in the booking database and provision them on fresh installs. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN CREATE TYPE "public"."enum_booking_settings_payment_gateway" AS ENUM('none', 'midtrans', 'xendit'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_bookings_payment_gateway" AS ENUM('midtrans', 'xendit'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_bookings_payment_status" AS ENUM('pending', 'paid', 'failed', 'expired', 'cancelled', 'partially_refunded', 'refunded', 'unknown'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  ALTER TABLE "booking_settings" ADD COLUMN IF NOT EXISTS "payment_gateway" "enum_booking_settings_payment_gateway" DEFAULT 'none' NOT NULL;
  ALTER TABLE "booking_settings" ADD COLUMN IF NOT EXISTS "deposit_percent" numeric DEFAULT 50 NOT NULL;
  ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_gateway" "enum_bookings_payment_gateway";
  ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_reference" varchar;
  ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_amount" numeric;
  ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_status" "enum_bookings_payment_status";
  ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_checkout_url" varchar;
  ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_provider_transaction_id" varchar;
  ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_paid_at" timestamp(3) with time zone;
  ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_percent" numeric;`)
}

/** Do not drop payment data when rolling back application code. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  void db
}
