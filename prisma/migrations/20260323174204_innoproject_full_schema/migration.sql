-- CreateEnum
CREATE TYPE "ProjectARCStatus" AS ENUM ('DRAFT', 'HYPOTHESIS_DEFINED', 'IN_EXPERIMENTATION', 'ANALYZING_RESULTS', 'PIVOT', 'ADVANCEMENT_REACHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ARCTaskType" AS ENUM ('EXPERIMENTAL_DEVELOPMENT', 'APPLIED_RESEARCH', 'BASIC_RESEARCH', 'SUPPORT', 'NON_ELIGIBLE');

-- CreateEnum
CREATE TYPE "JournalEntryType" AS ENUM ('OBSERVATION', 'DISCOVERY', 'PROBLEM', 'DECISION', 'DIRECTION_CHANGE', 'TEST_RESULT', 'GENERAL');

-- CreateEnum
CREATE TYPE "TestResultType" AS ENUM ('CONCLUSIVE', 'NON_CONCLUSIVE', 'PARTIAL');

-- CreateEnum
CREATE TYPE "HypothesisStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('PLANNED_EXPERIENCE', 'CRITICAL_TEST', 'DECISION_POINT', 'REVIEW', 'DELIVERABLE');

-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'ABANDONED';

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "decisions" TEXT,
ADD COLUMN     "nextSteps" TEXT,
ADD COLUMN     "problems" TEXT;

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "changeReason" TEXT,
ADD COLUMN     "type" "MilestoneType" NOT NULL DEFAULT 'DELIVERABLE';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "arcStatus" "ProjectARCStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "abandonReason" TEXT,
ADD COLUMN     "arcType" "ARCTaskType" NOT NULL DEFAULT 'EXPERIMENTAL_DEVELOPMENT';

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "isRetrospective" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Hypothesis" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "HypothesisStatus" NOT NULL DEFAULT 'ACTIVE',
    "pivotReason" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hypothesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "type" "JournalEntryType" NOT NULL DEFAULT 'GENERAL',
    "content" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestExperience" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "parameters" TEXT,
    "protocol" TEXT,
    "results" TEXT,
    "conclusion" TEXT,
    "resultType" "TestResultType",
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "journalEntryId" TEXT,
    "testExperienceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "t661Data" JSONB,
    "cricData" JSONB,
    "auditData" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Hypothesis" ADD CONSTRAINT "Hypothesis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExperience" ADD CONSTRAINT "TestExperience_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_testExperienceId_fkey" FOREIGN KEY ("testExperienceId") REFERENCES "TestExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
