CREATE TABLE "titck_skrs_products" (
	"gtin" varchar(32) PRIMARY KEY NOT NULL,
	"name" varchar(240) NOT NULL,
	"atc_code" varchar(32),
	"atc_name" varchar(240),
	"manufacturer" varchar(240),
	"prescription_type" varchar(120),
	"status" varchar(40) NOT NULL,
	"description" text,
	"is_essential" boolean DEFAULT false NOT NULL,
	"is_pediatric_essential" boolean DEFAULT false NOT NULL,
	"is_newborn_essential" boolean DEFAULT false NOT NULL,
	"active_since" date,
	"source_published_at" date NOT NULL,
	"source_document_url" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "titck_skrs_products_gtin_check" CHECK ("titck_skrs_products"."gtin" ~ '^[0-9]{8,14}$')
);
--> statement-breakpoint
ALTER TABLE "product_catalog" ADD COLUMN "source" varchar(24) DEFAULT 'MANUAL' NOT NULL;--> statement-breakpoint
CREATE INDEX "titck_skrs_products_name_idx" ON "titck_skrs_products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "titck_skrs_products_atc_idx" ON "titck_skrs_products" USING btree ("atc_code");--> statement-breakpoint
CREATE INDEX "titck_skrs_products_published_idx" ON "titck_skrs_products" USING btree ("source_published_at");--> statement-breakpoint
ALTER TABLE "product_catalog" ADD CONSTRAINT "product_catalog_source_check" CHECK ("product_catalog"."source" in ('MANUAL', 'TITCK'));