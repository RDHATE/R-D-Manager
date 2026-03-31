import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SaisieTempsClient } from "./saisie-temps-client"

export default async function TempsPage() {
  const session = await requireAuth()

  const [projects, entries] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: session.user.organizationId, status: "ACTIVE" },
      select: {
        id: true, name: true, code: true,
        tasks: { select: { id: true, title: true }, orderBy: { title: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.timeEntry.findMany({
      where: { project: { organizationId: session.user.organizationId } },
      include: {
        user:    { select: { id: true, name: true } },
        project: { select: { id: true, name: true, code: true } },
        task:    { select: { id: true, title: true } },
      },
      orderBy: { date: "desc" },
      take: 100,
    }),
  ])

  const totalHeures = entries
    .filter(e => e.userId === session.user.id)
    .reduce((s, e) => s + e.hours, 0)

  const rdHeures = entries
    .filter(e => e.userId === session.user.id && e.category === "RD_DIRECT")
    .reduce((s, e) => s + e.hours, 0)

  return (
    <SaisieTempsClient
      projects={projects as any}
      entries={entries as any}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
      totalHeures={totalHeures}
      rdHeures={rdHeures}
    />
  )
}
