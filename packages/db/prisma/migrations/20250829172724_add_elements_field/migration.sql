-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "elements" JSONB NOT NULL DEFAULT '{}';
