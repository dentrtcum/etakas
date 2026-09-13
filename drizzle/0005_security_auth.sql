ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "disabled_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "product_batches" ADD COLUMN "submitted_name" varchar(240);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "auth_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "email_verified_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE "security_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL CONSTRAINT "security_challenges_user_id_users_id_fk" REFERENCES "users"("id") ON DELETE cascade,
  "purpose" varchar(32) NOT NULL,
  "secret_hash" text NOT NULL,
  "browser_hash" text,
  "auth_version" integer NOT NULL,
  "next_path" text DEFAULT '/panel' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "security_challenges_user_idx" ON "security_challenges" ("user_id");
--> statement-breakpoint
CREATE INDEX "security_challenges_expiry_idx" ON "security_challenges" ("expires_at");
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
  "key" text PRIMARY KEY NOT NULL,
  "count" integer DEFAULT 1 NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_expiry_idx" ON "rate_limit_buckets" ("expires_at");
--> statement-breakpoint
-- Old sessions have no completed email challenge. Revoke them at the upgrade.
DELETE FROM "sessions";
--> statement-breakpoint
DROP INDEX "orders_idempotency_key_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_buyer_idempotency_key_unique" ON "orders" ("buyer_organization_id", "idempotency_key");
--> statement-breakpoint
CREATE TABLE "policy_acceptances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL CONSTRAINT "policy_acceptances_user_id_users_id_fk" REFERENCES "users"("id") ON DELETE cascade,
  "organization_id" uuid CONSTRAINT "policy_acceptances_organization_id_organizations_id_fk" REFERENCES "organizations"("id") ON DELETE cascade,
  "document_key" varchar(80) NOT NULL,
  "document_version" varchar(40) NOT NULL,
  "accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ip_hash" text
);
--> statement-breakpoint
CREATE INDEX "policy_acceptances_user_idx" ON "policy_acceptances" ("user_id");
