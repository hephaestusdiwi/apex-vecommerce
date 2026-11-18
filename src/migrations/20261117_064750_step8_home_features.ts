import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_order_status_events_from_status" AS ENUM('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'expired');
  CREATE TYPE "public"."enum_order_status_events_to_status" AS ENUM('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'expired');
  CREATE TYPE "public"."enum_order_status_events_source" AS ENUM('customer', 'staff', 'system', 'gateway');
  CREATE TYPE "public"."enum_home_features_sections_stats_icon" AS ENUM('none', 'video');
  CREATE TABLE "order_status_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id" integer NOT NULL,
  	"from_status" "enum_order_status_events_from_status",
  	"to_status" "enum_order_status_events_to_status" NOT NULL,
  	"source" "enum_order_status_events_source" NOT NULL,
  	"actor_id" integer,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "home_features_sections_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar,
  	"icon" "enum_home_features_sections_stats_icon" DEFAULT 'none'
  );
  
  CREATE TABLE "home_features_sections_tabs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tab" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"image_id" integer,
  	"video_id" integer
  );
  
  CREATE TABLE "home_features_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"eyebrow" varchar,
  	"heading" varchar NOT NULL,
  	"body" varchar,
  	"body_highlight" varchar,
  	"image_left_id" integer,
  	"image_right_id" integer,
  	"tabs_heading" varchar
  );
  
  CREATE TABLE "home_features" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "order_status_events_id" integer;
  ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_features_sections_stats" ADD CONSTRAINT "home_features_sections_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_features_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_features_sections_tabs" ADD CONSTRAINT "home_features_sections_tabs_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_features_sections_tabs" ADD CONSTRAINT "home_features_sections_tabs_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_features_sections_tabs" ADD CONSTRAINT "home_features_sections_tabs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_features_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_features_sections" ADD CONSTRAINT "home_features_sections_image_left_id_media_id_fk" FOREIGN KEY ("image_left_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_features_sections" ADD CONSTRAINT "home_features_sections_image_right_id_media_id_fk" FOREIGN KEY ("image_right_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_features_sections" ADD CONSTRAINT "home_features_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_features"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "order_status_events_order_idx" ON "order_status_events" USING btree ("order_id");
  CREATE INDEX "order_status_events_actor_idx" ON "order_status_events" USING btree ("actor_id");
  CREATE INDEX "order_status_events_updated_at_idx" ON "order_status_events" USING btree ("updated_at");
  CREATE INDEX "order_status_events_created_at_idx" ON "order_status_events" USING btree ("created_at");
  CREATE INDEX "home_features_sections_stats_order_idx" ON "home_features_sections_stats" USING btree ("_order");
  CREATE INDEX "home_features_sections_stats_parent_id_idx" ON "home_features_sections_stats" USING btree ("_parent_id");
  CREATE INDEX "home_features_sections_tabs_order_idx" ON "home_features_sections_tabs" USING btree ("_order");
  CREATE INDEX "home_features_sections_tabs_parent_id_idx" ON "home_features_sections_tabs" USING btree ("_parent_id");
  CREATE INDEX "home_features_sections_tabs_image_idx" ON "home_features_sections_tabs" USING btree ("image_id");
  CREATE INDEX "home_features_sections_tabs_video_idx" ON "home_features_sections_tabs" USING btree ("video_id");
  CREATE INDEX "home_features_sections_order_idx" ON "home_features_sections" USING btree ("_order");
  CREATE INDEX "home_features_sections_parent_id_idx" ON "home_features_sections" USING btree ("_parent_id");
  CREATE INDEX "home_features_sections_image_left_idx" ON "home_features_sections" USING btree ("image_left_id");
  CREATE INDEX "home_features_sections_image_right_idx" ON "home_features_sections" USING btree ("image_right_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_order_status_events_fk" FOREIGN KEY ("order_status_events_id") REFERENCES "public"."order_status_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_order_status_events_id_idx" ON "payload_locked_documents_rels" USING btree ("order_status_events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "order_status_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_features_sections_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_features_sections_tabs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_features_sections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_features" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "order_status_events" CASCADE;
  DROP TABLE "home_features_sections_stats" CASCADE;
  DROP TABLE "home_features_sections_tabs" CASCADE;
  DROP TABLE "home_features_sections" CASCADE;
  DROP TABLE "home_features" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_order_status_events_fk";
  
  DROP INDEX "payload_locked_documents_rels_order_status_events_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "order_status_events_id";
  DROP TYPE "public"."enum_order_status_events_from_status";
  DROP TYPE "public"."enum_order_status_events_to_status";
  DROP TYPE "public"."enum_order_status_events_source";
  DROP TYPE "public"."enum_home_features_sections_stats_icon";`)
}
