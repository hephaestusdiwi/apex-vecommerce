import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "carts_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"quantity" numeric NOT NULL,
  	"price_seen" numeric
  );
  
  CREATE TABLE IF NOT EXISTS "carts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer,
  	"token_hash" varchar,
  	"last_active_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "carts_id" integer;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_items_product_id_products_id_fk' AND conrelid = 'public.carts_items'::regclass) THEN
      ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_items_parent_id_fk' AND conrelid = 'public.carts_items'::regclass) THEN
      ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_customer_id_users_id_fk' AND conrelid = 'public.carts'::regclass) THEN
      ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_carts_fk' AND conrelid = 'public.payload_locked_documents_rels'::regclass) THEN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END $$;
  CREATE INDEX IF NOT EXISTS "carts_items_order_idx" ON "carts_items" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "carts_items_parent_id_idx" ON "carts_items" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "carts_items_product_idx" ON "carts_items" USING btree ("product_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "carts_customer_idx" ON "carts" USING btree ("customer_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "carts_token_hash_idx" ON "carts" USING btree ("token_hash");
  CREATE INDEX IF NOT EXISTS "carts_last_active_at_idx" ON "carts" USING btree ("last_active_at");
  CREATE INDEX IF NOT EXISTS "carts_updated_at_idx" ON "carts" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "carts_created_at_idx" ON "carts" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("carts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "carts_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "carts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE IF EXISTS "carts_items" CASCADE;
  DROP TABLE IF EXISTS "carts" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_carts_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_carts_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "carts_id";`)
}
