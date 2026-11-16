import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_highlights_layout" AS ENUM('media', 'split', 'statement');
  CREATE TABLE "products_highlights_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar
  );
  
  ALTER TABLE "products_highlights" ADD COLUMN "layout" "enum_products_highlights_layout" DEFAULT 'media';
  ALTER TABLE "products_highlights" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "products_highlights_stats" ADD CONSTRAINT "products_highlights_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_highlights"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_highlights_stats_order_idx" ON "products_highlights_stats" USING btree ("_order");
  CREATE INDEX "products_highlights_stats_parent_id_idx" ON "products_highlights_stats" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_highlights_stats" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_highlights_stats" CASCADE;
  ALTER TABLE "products_highlights" DROP COLUMN "layout";
  ALTER TABLE "products_highlights" DROP COLUMN "eyebrow";
  DROP TYPE "public"."enum_products_highlights_layout";`)
}
