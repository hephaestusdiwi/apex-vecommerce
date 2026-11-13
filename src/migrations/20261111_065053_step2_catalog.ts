import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_stock_movements_reason" AS ENUM('restock', 'correction', 'damaged', 'order_reserve', 'order_release');
  CREATE TABLE "product_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"description" varchar,
  	"image_id" integer,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "products_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"alt" varchar
  );
  
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"sku" varchar,
  	"description" varchar,
  	"category_id" integer,
  	"price" numeric NOT NULL,
  	"compare_at_price" numeric,
  	"active" boolean DEFAULT false,
  	"track_stock" boolean DEFAULT true,
  	"stock" numeric DEFAULT 0,
  	"low_stock_threshold" numeric DEFAULT 5,
  	"weight_grams" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	CONSTRAINT "products_stock_non_negative" CHECK ("products"."stock" >= 0),
  	CONSTRAINT "products_price_non_negative" CHECK ("products"."price" >= 0)
  );
  
  CREATE TABLE "stock_movements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"reason" "enum_stock_movements_reason" DEFAULT 'restock' NOT NULL,
  	"delta" numeric NOT NULL,
  	"reference" varchar,
  	"note" varchar,
  	"stock_before" numeric,
  	"stock_after" numeric,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "product_categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "products_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "stock_movements_id" integer;
  ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_images" ADD CONSTRAINT "products_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_images" ADD CONSTRAINT "products_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "product_categories_slug_idx" ON "product_categories" USING btree ("slug");
  CREATE INDEX "product_categories_image_idx" ON "product_categories" USING btree ("image_id");
  CREATE INDEX "product_categories_active_idx" ON "product_categories" USING btree ("active");
  CREATE INDEX "product_categories_updated_at_idx" ON "product_categories" USING btree ("updated_at");
  CREATE INDEX "product_categories_created_at_idx" ON "product_categories" USING btree ("created_at");
  CREATE INDEX "products_images_order_idx" ON "products_images" USING btree ("_order");
  CREATE INDEX "products_images_parent_id_idx" ON "products_images" USING btree ("_parent_id");
  CREATE INDEX "products_images_image_idx" ON "products_images" USING btree ("image_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE UNIQUE INDEX "products_sku_idx" ON "products" USING btree ("sku");
  CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");
  CREATE INDEX "products_active_idx" ON "products" USING btree ("active");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "stock_movements_product_idx" ON "stock_movements" USING btree ("product_id");
  CREATE INDEX "stock_movements_created_by_idx" ON "stock_movements" USING btree ("created_by_id");
  CREATE INDEX "stock_movements_updated_at_idx" ON "stock_movements" USING btree ("updated_at");
  CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_categories_fk" FOREIGN KEY ("product_categories_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_movements_fk" FOREIGN KEY ("stock_movements_id") REFERENCES "public"."stock_movements"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_product_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("product_categories_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_stock_movements_id_idx" ON "payload_locked_documents_rels" USING btree ("stock_movements_id");
  -- Pengaman stok di level database (trigger tidak bisa dideklarasikan lewat skema Payload) --
  CREATE OR REPLACE FUNCTION apex_guard_product_stock() RETURNS trigger AS $$
  BEGIN
    -- Kolom stock hanya boleh berubah dari jalur pergerakan stok (yang menyetel apex.stock_write di transaksinya).
    -- Penulisan lain (mis. form admin dengan nilai lama) diabaikan diam-diam, bukan ditolak.
    IF current_setting('apex.stock_write', true) IS DISTINCT FROM 'on' THEN
      IF TG_OP = 'INSERT' THEN
        NEW."stock" := 0;
      ELSIF NEW."stock" IS DISTINCT FROM OLD."stock" THEN
        NEW."stock" := OLD."stock";
      END IF;
    END IF;
    RETURN NEW;
  END
  $$ LANGUAGE plpgsql;
  CREATE TRIGGER apex_guard_product_stock BEFORE INSERT OR UPDATE ON "products"
    FOR EACH ROW EXECUTE FUNCTION apex_guard_product_stock();`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TRIGGER IF EXISTS apex_guard_product_stock ON "products";
  DROP FUNCTION IF EXISTS apex_guard_product_stock();
   ALTER TABLE "product_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stock_movements" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "product_categories" CASCADE;
  DROP TABLE "products_images" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "stock_movements" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_product_categories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_products_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_stock_movements_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_product_categories_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_products_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_stock_movements_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "product_categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "products_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "stock_movements_id";
  DROP TYPE "public"."enum_stock_movements_reason";`)
}
