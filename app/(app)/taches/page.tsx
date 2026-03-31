import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { TachesClient } from "./taches-client"

export default async function TachesPage() {
  const session = await requireAuth()

  const [tasks, projects, members] = await Promise.all([
    prisma.task.findMany({
      where: {
        project: { organizationId: session.user.organizationId },
        parentId: null,
      },
      include: {
        project:  { select: { id: true, name: true, code: true } },
        assignee: { select: { id: true, name: true } },
        children: { select: { id: true, status: true } },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    }),
    prisma.project.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <TachesClient
      tasks={tasks as any}
      projects={projects}
      members={members}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  )
}
