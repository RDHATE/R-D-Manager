import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ProjetsClient } from "./projets-client"

export default async function ProjetsPage() {
  const session = await requireAuth()
  const orgId = session.user.organizationId

  const [projects, doneCounts, hoursData] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { tasks: true, members: true, timeEntries: true } },
        members: { where: { userId: session.user.id }, select: { role: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.groupBy({
      by: ["projectId"],
      where: { project: { organizationId: orgId }, status: "DONE" },
      _count: { _all: true },
    }),
    prisma.timeEntry.groupBy({
      by: ["projectId"],
      where: { project: { organizationId: orgId } },
      _sum: { hours: true },
    }),
  ])

  const doneMap = Object.fromEntries(doneCounts.map(d => [d.projectId, d._count._all]))
  const hoursMap = Object.fromEntries(hoursData.map(h => [h.projectId, h._sum.hours ?? 0]))

  const enriched = projects.map(p => ({
    ...p,
    startDate: p.startDate.toISOString(),
    endDate:   p.endDate?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    doneTaskCount:   doneMap[p.id] ?? 0,
    hoursLogged:     hoursMap[p.id] ?? 0,
    isMember:        p.members.length > 0,
    memberRole:      p.members[0]?.role ?? null,
  }))

  return (
    <ProjetsClient
      projects={enriched as any}
      canCreate={session.user.role === "ADMIN" || session.user.role === "PROJECT_MANAGER"}
    />
  )
}
