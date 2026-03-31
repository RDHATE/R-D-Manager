import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ExperiencesClient } from "./experiences-client"

export default async function ExperiencesPage() {
  const session = await requireAuth()

  const [cards, projects, members] = await Promise.all([
    prisma.experimentCard.findMany({
      where: { project: { organizationId: session.user.organizationId } },
      include: {
        project:    { select: { id: true, name: true, code: true } },
        assignee:   { select: { id: true, name: true } },
        sprint:     { select: { id: true, title: true } },
        hypothesis: { select: { id: true, title: true } },
        pivots:     { select: { id: true } },
        _count:     { select: { journalEntries: true, attachments: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.project.findMany({
      where: { organizationId: session.user.organizationId, status: "ACTIVE" },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return <ExperiencesClient cards={cards as any} projects={projects} members={members as any} />
}
