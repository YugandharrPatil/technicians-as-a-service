-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."property_status" AS ENUM('available', 'sold', 'pending');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('house', 'apartment', 'condo', 'townhouse', 'land', 'commercial');--> statement-breakpoint
CREATE TYPE "public"."sender_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."visit_status" AS ENUM('pending', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE SEQUENCE "public"."pet_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."agency_projects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."agency_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "taas_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text DEFAULT '',
	"role" text DEFAULT 'client',
	"roles" text[] DEFAULT '{"RAY['client'::tex"}',
	"rating_avg" numeric(3, 1) DEFAULT '0',
	"rating_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "taas_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"technician_id" uuid NOT NULL,
	"service_type" text NOT NULL,
	"problem_description" text NOT NULL,
	"address" text NOT NULL,
	"preferred_date_time" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'requested',
	"negotiated_price" numeric(10, 2),
	"negotiated_date_time" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"completed_by_client" boolean DEFAULT false,
	"completed_by_technician" boolean DEFAULT false,
	"lead_contacted" boolean DEFAULT false,
	"lead_closed" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "taas_technicians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"job_types" text[] NOT NULL,
	"bio" text NOT NULL,
	"tags" text[] DEFAULT '{""}',
	"cities" text[] DEFAULT '{""}',
	"rating_avg" numeric(3, 1) DEFAULT '0',
	"rating_count" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true,
	"photo_url" text,
	"embedding" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "taas_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"sender_type" text NOT NULL,
	"message" text NOT NULL,
	"offer_price" numeric(10, 2),
	"offer_date_time" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "taas_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"technician_id" uuid NOT NULL,
	"reviewer_id" text NOT NULL,
	"reviewee_id" text NOT NULL,
	"stars" integer NOT NULL,
	"text" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "taas_bookings" ADD CONSTRAINT "taas_bookings_client_id_taas_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."taas_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taas_bookings" ADD CONSTRAINT "taas_bookings_technician_id_taas_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."taas_technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taas_technicians" ADD CONSTRAINT "taas_technicians_user_id_taas_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."taas_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taas_chats" ADD CONSTRAINT "taas_chats_booking_id_taas_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."taas_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taas_reviews" ADD CONSTRAINT "taas_reviews_booking_id_taas_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."taas_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taas_reviews" ADD CONSTRAINT "taas_reviews_technician_id_taas_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."taas_technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookings_client_id" ON "taas_bookings" USING btree ("client_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "taas_bookings" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_technician_id" ON "taas_bookings" USING btree ("technician_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_technicians_is_visible" ON "taas_technicians" USING btree ("is_visible" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_technicians_user_id" ON "taas_technicians" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_messages_booking_id" ON "taas_chats" USING btree ("booking_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_reviews_booking_id" ON "taas_reviews" USING btree ("booking_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_reviews_reviewee_id" ON "taas_reviews" USING btree ("reviewee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_reviews_reviewer_id" ON "taas_reviews" USING btree ("reviewer_id" text_ops);
*/