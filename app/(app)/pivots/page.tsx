import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { PivotsClient } from "./pivots-client"

export default async function PivotsPage() {
  const session = await requireAuth()

  const [pivots, projects] = await Promise.all([
    prisma.pivot.findMany({
      where: {
        project: { organizationId: session.user.organizationId },
        parentPivotId: null,
      },
      include: {
        experimentCard: { select: { id: true, title: true, status: true } },
        createdBy:      { select: { name: true } },
        project:        { select: { id: true, name: true, code: true } },
        childPivots: {
          include: {
            experimentCard: { select: { id: true, title: true, status: true } },
            createdBy:      { select: { name: true } },
            project:        { select: { id: true, name: true, code: true } },
            childPivots: {
              include: {
                experimentCard: { select: { id: true, title: true, status: true } },
                createdBy:      { select: { name: true } },
                project:        { select: { id: true, name: true, code: true } },
                childPivots:    {
                  include: {
                    experimentCard: { select: { id: true, title: true } },
                    createdBy:      { select: { name: true } },
                    project:        { select: { id: true, name: true, code: true } },
                    childPivots:    true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { organizationId: session.user.organizationId, status: "ACTIVE" },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ])

  return <PivotsClient pivots={pivots as any} projects={projects} />
}
