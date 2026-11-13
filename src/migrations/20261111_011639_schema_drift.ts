import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Menyamakan migrasi dengan skema yang sudah dipakai kode: blok Team pada Pages dan kolom follow-up pada
 * Contacts/Bookings sebelumnya hanya ada lewat dev-push dan tidak pernah tercatat di migrasi, sehingga database
 * baru yang dibangun dari migrasi saja kehilangan kolom tersebut.
 *
 * Idempoten: aman dijalankan di database yang SUDAH memiliki objek ini (data tidak disentuh).
 * down() sengaja kosong: objek ini bisa sudah ada sebelum migrasi ini, jadi tidak boleh dihapus.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN CREATE TYPE "public"."enum_pages_blocks_team_members_socials_platform" AS ENUM('linkedin', 'instagram', 'x', 'github', 'facebook', 'youtube', 'email', 'website'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_pages_blocks_team_layout_width" AS ENUM('default', 'narrow', 'content', 'wide', 'full'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_pages_blocks_team_layout_space_before" AS ENUM('default', 'none', 'sm', 'md', 'lg', 'xl'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_pages_blocks_team_layout_space_after" AS ENUM('default', 'none', 'sm', 'md', 'lg', 'xl'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_pages_blocks_team_layout_motion" AS ENUM('default', 'none', 'reveal', 'parallax'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum__pages_v_blocks_team_members_socials_platform" AS ENUM('linkedin', 'instagram', 'x', 'github', 'facebook', 'youtube', 'email', 'website'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum__pages_v_blocks_team_layout_width" AS ENUM('default', 'narrow', 'content', 'wide', 'full'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum__pages_v_blocks_team_layout_space_before" AS ENUM('default', 'none', 'sm', 'md', 'lg', 'xl'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum__pages_v_blocks_team_layout_space_after" AS ENUM('default', 'none', 'sm', 'md', 'lg', 'xl'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum__pages_v_blocks_team_layout_motion" AS ENUM('default', 'none', 'reveal', 'parallax'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_contacts_follow_up_status" AS ENUM('new', 'contacted', 'deal', 'dropped'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN CREATE TYPE "public"."enum_bookings_follow_up_status" AS ENUM('new', 'contacted', 'deal', 'dropped'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  CREATE TABLE IF NOT EXISTS "pages_blocks_team_members_socials" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_pages_blocks_team_members_socials_platform" DEFAULT 'linkedin',
  	"url" varchar
  );
  CREATE TABLE IF NOT EXISTS "pages_blocks_team_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"photo_id" integer,
  	"name" varchar,
  	"role" varchar,
  	"bio" varchar
  );
  CREATE TABLE IF NOT EXISTS "pages_blocks_team" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"subtitle" varchar,
  	"layout_width" "enum_pages_blocks_team_layout_width" DEFAULT 'default',
  	"layout_space_before" "enum_pages_blocks_team_layout_space_before" DEFAULT 'default',
  	"layout_space_after" "enum_pages_blocks_team_layout_space_after" DEFAULT 'default',
  	"layout_motion" "enum_pages_blocks_team_layout_motion" DEFAULT 'default',
  	"block_name" varchar
  );
  CREATE TABLE IF NOT EXISTS "_pages_v_blocks_team_members_socials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" "enum__pages_v_blocks_team_members_socials_platform" DEFAULT 'linkedin',
  	"url" varchar,
  	"_uuid" varchar
  );
  CREATE TABLE IF NOT EXISTS "_pages_v_blocks_team_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"photo_id" integer,
  	"name" varchar,
  	"role" varchar,
  	"bio" varchar,
  	"_uuid" varchar
  );
  CREATE TABLE IF NOT EXISTS "_pages_v_blocks_team" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"subtitle" varchar,
  	"layout_width" "enum__pages_v_blocks_team_layout_width" DEFAULT 'default',
  	"layout_space_before" "enum__pages_v_blocks_team_layout_space_before" DEFAULT 'default',
  	"layout_space_after" "enum__pages_v_blocks_team_layout_space_after" DEFAULT 'default',
  	"layout_motion" "enum__pages_v_blocks_team_layout_motion" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "follow_up_status" "enum_contacts_follow_up_status";
  ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "follow_up_notes" varchar;
  ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "follow_up_updated_at" timestamp(3) with time zone;
  ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "follow_up_status" "enum_bookings_follow_up_status";
  ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "follow_up_notes" varchar;
  ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "follow_up_updated_at" timestamp(3) with time zone;
  DO $$ BEGIN ALTER TABLE "pages_blocks_team_members_socials" ADD CONSTRAINT "pages_blocks_team_members_socials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_team_members"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN ALTER TABLE "pages_blocks_team_members" ADD CONSTRAINT "pages_blocks_team_members_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN ALTER TABLE "pages_blocks_team_members" ADD CONSTRAINT "pages_blocks_team_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_team"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN ALTER TABLE "pages_blocks_team" ADD CONSTRAINT "pages_blocks_team_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN ALTER TABLE "_pages_v_blocks_team_members_socials" ADD CONSTRAINT "_pages_v_blocks_team_members_socials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_team_members"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN ALTER TABLE "_pages_v_blocks_team_members" ADD CONSTRAINT "_pages_v_blocks_team_members_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN ALTER TABLE "_pages_v_blocks_team_members" ADD CONSTRAINT "_pages_v_blocks_team_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_team"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN ALTER TABLE "_pages_v_blocks_team" ADD CONSTRAINT "_pages_v_blocks_team_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  CREATE INDEX IF NOT EXISTS "pages_blocks_team_members_socials_order_idx" ON "pages_blocks_team_members_socials" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "pages_blocks_team_members_socials_parent_id_idx" ON "pages_blocks_team_members_socials" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "pages_blocks_team_members_order_idx" ON "pages_blocks_team_members" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "pages_blocks_team_members_parent_id_idx" ON "pages_blocks_team_members" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "pages_blocks_team_members_photo_idx" ON "pages_blocks_team_members" USING btree ("photo_id");
  CREATE INDEX IF NOT EXISTS "pages_blocks_team_order_idx" ON "pages_blocks_team" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "pages_blocks_team_parent_id_idx" ON "pages_blocks_team" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "pages_blocks_team_path_idx" ON "pages_blocks_team" USING btree ("_path");
  CREATE INDEX IF NOT EXISTS "_pages_v_blocks_team_members_socials_order_idx" ON "_pages_v_blocks_team_members_socials" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "_pages_v_blocks_team_members_socials_parent_id_idx" ON "_pages_v_blocks_team_members_socials" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "_pages_v_blocks_team_members_order_idx" ON "_pages_v_blocks_team_members" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "_pages_v_blocks_team_members_parent_id_idx" ON "_pages_v_blocks_team_members" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "_pages_v_blocks_team_members_photo_idx" ON "_pages_v_blocks_team_members" USING btree ("photo_id");
  CREATE INDEX IF NOT EXISTS "_pages_v_blocks_team_order_idx" ON "_pages_v_blocks_team" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "_pages_v_blocks_team_parent_id_idx" ON "_pages_v_blocks_team" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "_pages_v_blocks_team_path_idx" ON "_pages_v_blocks_team" USING btree ("_path");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  void db
}
