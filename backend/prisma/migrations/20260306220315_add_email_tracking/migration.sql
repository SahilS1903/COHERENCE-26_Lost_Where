-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "replyBody" TEXT,
ADD COLUMN     "replySubject" TEXT;

-- AlterTable
ALTER TABLE "OutboxQueue" ADD COLUMN     "messageId" TEXT;
