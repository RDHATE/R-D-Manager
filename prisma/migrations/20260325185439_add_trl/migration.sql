-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "trlLevel" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "TRLHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromLevel" INTEGER NOT NULL,
    "toLevel" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TRLHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TRLHistory" ADD CONSTRAINT "TRLHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
