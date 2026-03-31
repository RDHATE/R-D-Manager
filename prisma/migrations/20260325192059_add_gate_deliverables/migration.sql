-- CreateTable
CREATE TABLE "GateDeliverable" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gate" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GateDeliverable_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GateDeliverable" ADD CONSTRAINT "GateDeliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
