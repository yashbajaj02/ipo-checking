CREATE TABLE IF NOT EXISTS "user_pans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"holder_name" varchar(255) NOT NULL,
	"pan_number" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_pans" ADD CONSTRAINT "user_pans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_pans_user_id" ON "user_pans" USING btree ("user_id");
--> statement-breakpoint
ALTER TABLE "user_pans" ALTER COLUMN "pan_number" TYPE text;