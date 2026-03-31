-- CreateEnum
CREATE TYPE "ExperimentCardStatus" AS ENUM ('HYPOTHESIS', 'PROTOCOL_DEFINED', 'IN_PROGRESS', 'RESULT_OBTAINED', 'ANALYSIS', 'VALIDATED', 'PIVOTED');

-- CreateEnum
CREATE TYPE "SprintStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "experimentCardId" TEXT;

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "experimentCardId" TEXT;

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SprintStatus" NOT NULL DEFAULT 'PLANNING',
    "retroLessons" TEXT,
    "retroPivot" TEXT,
    "capacity" DOUBLE PRECISION,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentCard" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hypothesisText" TEXT NOT NULL,
    "method" TEXT,
    "materials" TEXT,
    "variables" TEXT,
    "expectedResult" TEXT,
    "actualResult" TEXT,
    "conclusion" TEXT,
    "resultType" "TestResultType",
    "status" "ExperimentCardStatus" NOT NULL DEFAULT 'HYPOTHESIS',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "isRDEligible" BOOLEAN NOT NULL DEFAULT true,
    "projectId" TEXT NOT NULL,
    "sprintId" TEXT,
    "hypothesisId" TEXT,
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperimentCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pivot" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "oldDirection" TEXT NOT NULL,
    "newDirection" TEXT NOT NULL,
    "lessons" TEXT,
    "budgetImpact" TEXT,
    "timelineImpact" TEXT,
    "projectId" TEXT NOT NULL,
    "experimentCardId" TEXT,
    "parentPivotId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pivot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_experimentCardId_fkey" FOREIGN KEY ("experimentCardId") REFERENCES "ExperimentCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_experimentCardId_fkey" FOREIGN KEY ("experimentCardId") REFERENCES "ExperimentCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentCard" ADD CONSTRAINT "ExperimentCard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentCard" ADD CONSTRAINT "ExperimentCard_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentCard" ADD CONSTRAINT "ExperimentCard_hypothesisId_fkey" FOREIGN KEY ("hypothesisId") REFERENCES "Hypothesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentCard" ADD CONSTRAINT "ExperimentCard_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pivot" ADD CONSTRAINT "Pivot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pivot" ADD CONSTRAINT "Pivot_experimentCardId_fkey" FOREIGN KEY ("experimentCardId") REFERENCES "ExperimentCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pivot" ADD CONSTRAINT "Pivot_parentPivotId_fkey" FOREIGN KEY ("parentPivotId") REFERENCES "Pivot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pivot" ADD CONSTRAINT "Pivot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
