import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { EquipeClient } from "./equipe-client"

export default async function EquipePage() {
  const session = await requireAuth()
  const orgId = session.user.organizationId

  const now       = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const [members, weekHours, projectCounts] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, name: true, email: true, role: true,
        hourlyRate: true, weeklyCapacity: true, createdAt: true,
        _count: {
          select: {
            timeEntries:   true,
            assignedTasks: true,
            projectMembers: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.timeEntry.groupBy({
      by: ["userId"],
      where: { project: { organizationId: orgId }, date: { gte: weekStart, lt: weekEnd } },
      _sum: { hours: true },
    }),
    prisma.projectMember.groupBy({
      by: ["userId"],
      where: { project: { organizationId: orgId } },
      _count: { _all: true },
    }),
  ])

  const weekMap    = Object.fromEntries(weekHours.map(h   => [h.userId, h._sum.hours ?? 0]))
  const projMap    = Object.fromEntries(projectCounts.map(p => [p.userId, p._count._all]))

  const enriched = members.map(m => ({
    ...m,
    createdAt:    m.createdAt.toISOString(),
    weekHours:    weekMap[m.id]  ?? 0,
    projectCount: projMap[m.id]  ?? 0,
  }))

  return (
    <EquipeClient
      members={enriched as any}
      currentUserId={session.user.id}
      isAdmin={session.user.role === "ADMIN"}
    />
  )
}
