import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ChargeClient } from "./charge-client"

export default async function ChargePage() {
  const session = await requireAuth()
  const canManage = session.user.role === "ADMIN" || session.user.role === "PROJECT_MANAGER"

  // Lundi de la semaine courante
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const [members, projects] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: session.user.organizationId },
      select: {
        id: true, name: true, email: true, role: true,
        hourlyRate: true, weeklyCapacity: true,
        assignedTasks: {
          where: { status: { in: ["TODO", "IN_PROGRESS"] } },
          select: {
            id: true, title: true, status: true, estimatedHours: true,
            dueDate: true, priority: true,
            project: { select: { id: true, name: true, code: true } },
          },
          orderBy: { dueDate: "asc" },
        },
        timeEntries: {
          include: {
            project: { select: { id: true, name: true, code: true } },
            task:    { select: { id: true, title: true } },
          },
          orderBy: { date: "desc" },
          take: 200,
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { organizationId: session.user.organizationId, status: "ACTIVE" },
      select: {
        id: true, name: true, code: true,
        tasks: { select: { id: true, title: true }, orderBy: { title: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <ChargeClient
      members={members as any}
      projects={projects as any}
      currentUserId={session.user.id}
      canManage={canManage}
      weekStart={monday.toISOString()}
      weekEnd={sunday.toISOString()}
    />
  )
}
