import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_products_highlights_layout" ADD VALUE 'explorer';
  CREATE TABLE "products_highlights_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"image_id" integer
  );
  
  ALTER TABLE "products_highlights_items" ADD CONSTRAINT "products_highlights_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_highlights_items" ADD CONSTRAINT "products_highlights_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_highlights"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_highlights_items_order_idx" ON "products_highlights_items" USING btree ("_order");
  CREATE INDEX "products_highlights_items_parent_id_idx" ON "products_highlights_items" USING btree ("_parent_id");
  CREATE INDEX "products_highlights_items_image_idx" ON "products_highlights_items" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_highlights_items" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_highlights_items" CASCADE;
  ALTER TABLE "products_highlights" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "products_highlights" ALTER COLUMN "layout" SET DEFAULT 'media'::text;
  DROP TYPE "public"."enum_products_highlights_layout";
  CREATE TYPE "public"."enum_products_highlights_layout" AS ENUM('media', 'split', 'statement');
  ALTER TABLE "products_highlights" ALTER COLUMN "layout" SET DEFAULT 'media'::"public"."enum_products_highlights_layout";
  ALTER TABLE "products_highlights" ALTER COLUMN "layout" SET DATA TYPE "public"."enum_products_highlights_layout" USING "layout"::"public"."enum_products_highlights_layout";`)
}
