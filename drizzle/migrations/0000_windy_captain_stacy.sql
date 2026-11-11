CREATE TYPE "public"."upline_status" AS ENUM('LINKED', 'PENDING_UPLINE', 'UNREGISTERED_IN_MASTER', 'ROOT');--> statement-breakpoint
CREATE TYPE "public"."upload_batch_status" AS ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIAL_SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."upload_batch_type" AS ENUM('DATA_AGENT', 'MASTER_PRODUKSI', 'MASTER_CLAIM');--> statement-breakpoint
CREATE TYPE "public"."upload_row_status" AS ENUM('SUCCESS', 'WARNING', 'ERROR', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('SUPERADMIN', 'ADMIN', 'KACAB', 'PIC_CABANG', 'AGENT', 'OFFICER_AGENT', 'AUDIT');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"raw_alias" varchar(255),
	"is_auto_provisioned" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_code" varchar(50) NOT NULL,
	"name" varchar(255) DEFAULT 'UNREGISTERED AGENT' NOT NULL,
	"prof_id" varchar(100),
	"status_keagenan" varchar(50),
	"upline_agent_code" varchar(50),
	"peringkat" varchar(100),
	"raw_branch_name" varchar(255),
	"parent_id" uuid,
	"upline_status" "upline_status" DEFAULT 'PENDING_UPLINE' NOT NULL,
	"materialized_path" text DEFAULT '/',
	"depth" integer DEFAULT 0 NOT NULL,
	"branch_id" uuid,
	"email" varchar(255),
	"phone" varchar(50),
	"is_placeholder" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "agents_agent_code_unique" UNIQUE("agent_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "production_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"branch_id" uuid,
	"source_batch_id" uuid,
	"bulan" varchar(50) NOT NULL,
	"period" date NOT NULL,
	"policy_status" varchar(50),
	"source_agent_id" varchar(50) NOT NULL,
	"profile_id" varchar(100),
	"agent_name" varchar(255),
	"agent_status" varchar(50),
	"raw_branch" varchar(255),
	"representative" varchar(255),
	"product" varchar(255),
	"coverage" varchar(255),
	"renewed" varchar(50),
	"prev_policy" varchar(100),
	"spau_type" varchar(100),
	"spau_no" varchar(100),
	"policy_no" varchar(100) NOT NULL,
	"start_period" date,
	"end_period" date,
	"insured_name" text,
	"currency_tsi" varchar(10) DEFAULT 'IDR',
	"rate_tsi" numeric(18, 4) DEFAULT '1.0000',
	"tsi" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"tsi_in_idr" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"nilai_premi" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"nilai_komisi" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"nilai_diskon" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"nilai_akusisi" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"object_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"branch_id" uuid,
	"source_batch_id" uuid,
	"source_agent_id" varchar(50) NOT NULL,
	"claim_no" varchar(100) NOT NULL,
	"policy_no" varchar(100) NOT NULL,
	"date_of_settlement" date,
	"period" date NOT NULL,
	"uw_year" varchar(10),
	"gross_claim" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"raw_branch" varchar(255),
	"nama_produk" varchar(255),
	"currency" varchar(10) DEFAULT 'IDR',
	"cause_of_loss" text,
	"indemnity" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"deductible" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"salvage" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"subrogation" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "upload_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_type" "upload_batch_type" NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_size" integer,
	"uploaded_by" uuid,
	"status" "upload_batch_status" DEFAULT 'QUEUED' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"processed_rows" integer DEFAULT 0 NOT NULL,
	"success_rows" integer DEFAULT 0 NOT NULL,
	"warning_rows" integer DEFAULT 0 NOT NULL,
	"failed_rows" integer DEFAULT 0 NOT NULL,
	"skipped_rows" integer DEFAULT 0 NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "upload_row_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"status" "upload_row_status" NOT NULL,
	"raw_data" jsonb NOT NULL,
	"normalized_data" jsonb,
	"warning_message" text,
	"error_message" text,
	"error_code" varchar(100),
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"name" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'AGENT' NOT NULL,
	"branch_id" uuid,
	"agent_id" uuid,
	"parent_agent_id" uuid,
	"created_by_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents" ADD CONSTRAINT "agents_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_records" ADD CONSTRAINT "production_records_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_records" ADD CONSTRAINT "production_records_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_records" ADD CONSTRAINT "production_records_source_batch_id_upload_batches_id_fk" FOREIGN KEY ("source_batch_id") REFERENCES "public"."upload_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_source_batch_id_upload_batches_id_fk" FOREIGN KEY ("source_batch_id") REFERENCES "public"."upload_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "upload_batches" ADD CONSTRAINT "upload_batches_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "upload_row_logs" ADD CONSTRAINT "upload_row_logs_batch_id_upload_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_parent_agent_id_agents_id_fk" FOREIGN KEY ("parent_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "branches_code_idx" ON "branches" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "branches_name_idx" ON "branches" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agents_agent_code_idx" ON "agents" USING btree ("agent_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_parent_id_idx" ON "agents" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_upline_agent_code_idx" ON "agents" USING btree ("upline_agent_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_upline_status_idx" ON "agents" USING btree ("upline_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_branch_id_idx" ON "agents" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_prof_id_idx" ON "agents" USING btree ("prof_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_materialized_path_idx" ON "agents" USING btree ("materialized_path" text_pattern_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_metadata_gin_idx" ON "agents" USING gin ("metadata");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_deleted_at_idx" ON "agents" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prod_agent_period_idx" ON "production_records" USING btree ("agent_id","period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prod_policy_period_idx" ON "production_records" USING btree ("policy_no","period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prod_branch_idx" ON "production_records" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prod_source_agent_idx" ON "production_records" USING btree ("source_agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prod_object_details_gin_idx" ON "production_records" USING gin ("object_details");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prod_deleted_at_idx" ON "production_records" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_agent_period_idx" ON "claims" USING btree ("agent_id","period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_policy_period_idx" ON "claims" USING btree ("policy_no","period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_branch_idx" ON "claims" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_source_agent_idx" ON "claims" USING btree ("source_agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_claim_no_idx" ON "claims" USING btree ("claim_no");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_deleted_at_idx" ON "claims" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_type_idx" ON "upload_batches" USING btree ("batch_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_status_idx" ON "upload_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_uploaded_by_idx" ON "upload_batches" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_created_at_idx" ON "upload_batches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "row_logs_batch_status_idx" ON "upload_row_logs" USING btree ("batch_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "row_logs_batch_row_idx" ON "upload_row_logs" USING btree ("batch_id","row_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "row_logs_raw_data_gin_idx" ON "upload_row_logs" USING gin ("raw_data");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_branch_id_idx" ON "users" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_agent_id_idx" ON "users" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_parent_agent_id_idx" ON "users" USING btree ("parent_agent_id");