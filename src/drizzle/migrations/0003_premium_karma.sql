ALTER TABLE "users" ADD COLUMN "unlock_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "unlock_code_expires_at" timestamp;