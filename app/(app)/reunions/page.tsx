import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ReunionsClient } from "./reunions-client"

export default async function ReunionsPage() {
  const session = await requireAuth()

  const [meetings, projects] = await Promise.all([
    prisma.meeting.findMany({
      where: { project: { organizationId: session.user.organizationId } },
      include: {
        project: { select: { id: true, name: true, code: true } },
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.project.findMany({
      where: { organizationId: session.user.organizationId, status: "ACTIVE" },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),

  ])

  const orgMembers = await prisma.user.findMany({
    where: { organizationId: session.user.organizationId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return (
    <ReunionsClient
      meetings={meetings as any}
      projects={projects}
      orgMembers={orgMembers}
    />
  )
}
