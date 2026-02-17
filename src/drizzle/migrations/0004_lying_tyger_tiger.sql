ALTER TABLE "positions" ALTER COLUMN "target_years" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "year_of_study" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "votes" ALTER COLUMN "voter_year_group" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."year_of_study";--> statement-breakpoint
CREATE TYPE "public"."year_of_study" AS ENUM('1', '2', '3', '4');--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "target_years" SET DATA TYPE "public"."year_of_study"[] USING "target_years"::"public"."year_of_study"[];--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "year_of_study" SET DATA TYPE "public"."year_of_study" USING "year_of_study"::"public"."year_of_study";--> statement-breakpoint
ALTER TABLE "votes" ALTER COLUMN "voter_year_group" SET DATA TYPE "public"."year_of_study" USING "voter_year_group"::"public"."year_of_study";