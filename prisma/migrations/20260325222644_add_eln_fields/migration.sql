-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signedBy" TEXT,
ADD COLUMN     "structuredData" JSONB,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "title" TEXT;
