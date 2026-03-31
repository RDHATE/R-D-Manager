import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { RapportsClient } from "./rapports-client"

export default async function RapportsPage() {
  const session = await requireAuth()

  const [reports, projects] = await Promise.all([
    prisma.report.findMany({
      where: { project: { organizationId: session.user.organizationId } },
      include: { project: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ])

  return <RapportsClient reports={reports as any} projects={projects} />
}
