import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** Orders table and inventory reservations for hosted cart checkout payments. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN CREATE TYPE "public"."enum_orders_payment_gateway" AS ENUM('midtrans', 'xendit'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_orders_payment_status" AS ENUM('pending', 'paid', 'failed', 'expired', 'cancelled', 'partially_refunded', 'refunded', 'unknown'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE IF NOT EXISTS 'expireOrders' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE IF NOT EXISTS 'expireOrders' BEFORE 'schedulePublish';

  CREATE TABLE IF NOT EXISTS "orders" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar NOT NULL,
    "access_token" varchar NOT NULL,
    "cart_id" integer,
    "customer_id" integer,
    "customer_name" varchar NOT NULL,
    "customer_email" varchar NOT NULL,
    "customer_phone" varchar NOT NULL,
    "notes" varchar,
    "subtotal" numeric NOT NULL,
    "total" numeric NOT NULL,
    "payment_gateway" "enum_orders_payment_gateway",
    "payment_reference" varchar,
    "payment_amount" numeric,
    "payment_status" "enum_orders_payment_status" DEFAULT 'pending',
    "payment_checkout_url" varchar,
    "payment_provider_transaction_id" varchar,
    "payment_paid_at" timestamp(3) with time zone,
    "status" "enum_orders_status" DEFAULT 'pending' NOT NULL,
    "hold_until" timestamp(3) with time zone,
    "stock_released_at" timestamp(3) with time zone,
    "inventory_review" boolean DEFAULT false,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE TABLE IF NOT EXISTS "orders_items" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "product_id" varchar NOT NULL,
    "title" varchar NOT NULL,
    "sku" varchar,
    "unit_price" numeric NOT NULL,
    "quantity" numeric NOT NULL,
    "line_total" numeric NOT NULL,
    "track_stock" boolean DEFAULT false
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "orders_id" integer;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_items_parent_id_fk' AND conrelid = 'public.orders_items'::regclass) THEN
      ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_cart_id_carts_id_fk' AND conrelid = 'public.orders'::regclass) THEN
      ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_customer_id_users_id_fk' AND conrelid = 'public.orders'::regclass) THEN
      ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_orders_fk' AND conrelid = 'public.payload_locked_documents_rels'::regclass) THEN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
  END $$;

  CREATE INDEX IF NOT EXISTS "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "orders_code_idx" ON "orders" USING btree ("code");
  CREATE INDEX IF NOT EXISTS "orders_cart_idx" ON "orders" USING btree ("cart_id");
  CREATE INDEX IF NOT EXISTS "orders_customer_idx" ON "orders" USING btree ("customer_id");
  CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" USING btree ("status");
  CREATE INDEX IF NOT EXISTS "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");`)
}

/** Preserve task enum labels; remove only the additive order tables on rollback. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders_items" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;
    DROP TABLE IF EXISTS "orders_items" CASCADE;
    DROP TABLE IF EXISTS "orders" CASCADE;
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_orders_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_orders_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "orders_id";`)
}
