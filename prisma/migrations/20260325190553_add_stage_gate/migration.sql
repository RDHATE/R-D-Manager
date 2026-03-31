-- CreateEnum
CREATE TYPE "GateDecision" AS ENUM ('GO', 'NO_GO', 'HOLD', 'RECYCLE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "currentGate" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StageGateDecision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gate" INTEGER NOT NULL,
    "decision" "GateDecision" NOT NULL,
    "criteria" JSONB,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageGateDecision_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StageGateDecision" ADD CONSTRAINT "StageGateDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
