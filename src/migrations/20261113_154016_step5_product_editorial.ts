import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "products_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"image_id" integer
  );
  
  ALTER TABLE "products" ADD COLUMN "tagline" varchar;
  ALTER TABLE "products_highlights" ADD CONSTRAINT "products_highlights_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_highlights" ADD CONSTRAINT "products_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_highlights_order_idx" ON "products_highlights" USING btree ("_order");
  CREATE INDEX "products_highlights_parent_id_idx" ON "products_highlights" USING btree ("_parent_id");
  CREATE INDEX "products_highlights_image_idx" ON "products_highlights" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_highlights" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_highlights" CASCADE;
  ALTER TABLE "products" DROP COLUMN "tagline";`)
}
