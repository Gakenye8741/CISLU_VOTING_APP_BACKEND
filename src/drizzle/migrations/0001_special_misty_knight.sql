ALTER TABLE "elections" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "elections" ALTER COLUMN "status" SET DEFAULT 'upcoming'::text;--> statement-breakpoint
DROP TYPE "public"."election_status";--> statement-breakpoint
CREATE TYPE "public"."election_status" AS ENUM('cancelled', 'upcoming', 'voting', 'completed');--> statement-breakpoint
ALTER TABLE "elections" ALTER COLUMN "status" SET DEFAULT 'upcoming'::"public"."election_status";--> statement-breakpoint
ALTER TABLE "elections" ALTER COLUMN "status" SET DATA TYPE "public"."election_status" USING "status"::"public"."election_status";