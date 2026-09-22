CREATE TYPE "public"."ipo_category" AS ENUM('MAINBOARD', 'SME', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."ipo_status" AS ENUM('UPCOMING', 'OPEN', 'CLOSED', 'LISTED');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('UNVERIFIED', 'PROVISIONAL', 'VERIFIED');--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority_rank" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_sources_provider_name_unique" UNIQUE("provider_name")
);
--> statement-breakpoint
CREATE TABLE "ingestion_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_source_id" uuid,
	"status" varchar(20) NOT NULL,
	"records_processed" integer DEFAULT 0,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ipo_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ipo_id" uuid NOT NULL,
	"offer_start_date" date,
	"offer_end_date" date,
	"allotment_date" date,
	"unblocking_date" date,
	"credit_to_demat_date" date,
	"listing_date" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ipo_gmp_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ipo_id" uuid NOT NULL,
	"data_source_id" uuid,
	"gmp_amount" numeric(10, 2) NOT NULL,
	"gmp_percentage" numeric(6, 2) NOT NULL,
	"estimated_listing_price" numeric(10, 2),
	"source_timestamp" timestamp with time zone NOT NULL,
	"fetched_timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"verification_status" "verification_status" DEFAULT 'UNVERIFIED' NOT NULL,
	"confidence_score" numeric(3, 2) DEFAULT '1.00'
);
--> statement-breakpoint
CREATE TABLE "ipo_listing_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ipo_id" uuid NOT NULL,
	"issue_price" numeric(10, 2) NOT NULL,
	"listing_price" numeric(10, 2) NOT NULL,
	"final_gmp_before_listing" numeric(10, 2),
	"gmp_vs_actual_variance" numeric(6, 2),
	"listed_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ipo_listing_results_ipo_id_unique" UNIQUE("ipo_id")
);
--> statement-breakpoint
CREATE TABLE "ipo_subscription_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ipo_id" uuid NOT NULL,
	"data_source_id" uuid,
	"snapshot_timestamp" timestamp with time zone NOT NULL,
	"qib_subscription" numeric(8, 2),
	"nii_subscription" numeric(8, 2),
	"b_nii_subscription" numeric(8, 2),
	"s_nii_subscription" numeric(8, 2),
	"retail_subscription" numeric(8, 2),
	"employee_subscription" numeric(8, 2),
	"shareholder_subscription" numeric(8, 2),
	"total_subscription" numeric(8, 2) NOT NULL,
	"fetched_timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ipos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"symbol" varchar(50),
	"slug" varchar(255) NOT NULL,
	"category" "ipo_category" DEFAULT 'UNKNOWN' NOT NULL,
	"status" "ipo_status" DEFAULT 'UPCOMING' NOT NULL,
	"price_band_min" numeric(10, 2),
	"price_band_max" numeric(10, 2),
	"lot_size" integer,
	"issue_size_crores" numeric(10, 2),
	"fresh_issue_crores" numeric(10, 2),
	"ofs_crores" numeric(10, 2),
	"face_value" numeric(6, 2),
	"retail_quota_percent" numeric(5, 2),
	"qib_quota_percent" numeric(5, 2),
	"nii_quota_percent" numeric(5, 2),
	"drhp_url" text,
	"rhp_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ipos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ipo_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"channel" varchar(20) DEFAULT 'WEB_PUSH' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" varchar(100),
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ipo_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingestion_logs" ADD CONSTRAINT "ingestion_logs_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipo_dates" ADD CONSTRAINT "ipo_dates_ipo_id_ipos_id_fk" FOREIGN KEY ("ipo_id") REFERENCES "public"."ipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipo_gmp_history" ADD CONSTRAINT "ipo_gmp_history_ipo_id_ipos_id_fk" FOREIGN KEY ("ipo_id") REFERENCES "public"."ipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipo_gmp_history" ADD CONSTRAINT "ipo_gmp_history_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipo_listing_results" ADD CONSTRAINT "ipo_listing_results_ipo_id_ipos_id_fk" FOREIGN KEY ("ipo_id") REFERENCES "public"."ipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipo_subscription_history" ADD CONSTRAINT "ipo_subscription_history_ipo_id_ipos_id_fk" FOREIGN KEY ("ipo_id") REFERENCES "public"."ipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipo_subscription_history" ADD CONSTRAINT "ipo_subscription_history_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ipo_id_ipos_id_fk" FOREIGN KEY ("ipo_id") REFERENCES "public"."ipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_ipo_id_ipos_id_fk" FOREIGN KEY ("ipo_id") REFERENCES "public"."ipos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_gmp_ipo_timestamp" ON "ipo_gmp_history" USING btree ("ipo_id","source_timestamp");--> statement-breakpoint
CREATE INDEX "idx_sub_ipo_timestamp" ON "ipo_subscription_history" USING btree ("ipo_id","snapshot_timestamp");--> statement-breakpoint
CREATE INDEX "idx_ipos_status_category" ON "ipos" USING btree ("status","category");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_watchlist_user_ipo" ON "watchlists" USING btree ("user_id","ipo_id");