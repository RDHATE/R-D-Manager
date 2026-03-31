import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { JournalClient } from "./journal-client"

export default async function JournalPage() {
  const session = await requireAuth()

  const [entries, projects] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { project: { organizationId: session.user.organizationId } },
      include: {
        author:      { select: { id: true, name: true } },
        project:     { select: { id: true, name: true, code: true } },
        attachments: { select: { id: true, fileName: true, fileUrl: true, mimeType: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { organizationId: session.user.organizationId, status: "ACTIVE" },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ])

  return <JournalClient entries={entries as any} projects={projects} />
}
