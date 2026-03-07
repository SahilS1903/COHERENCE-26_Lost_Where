-- AlterTable
ALTER TABLE "OutboxQueue" ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]';
