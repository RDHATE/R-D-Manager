import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { TestsClient } from "./tests-client"

export default async function TestsPage() {
  const session = await requireAuth()

  const [tests, projects] = await Promise.all([
    prisma.testExperience.findMany({
      where: { project: { organizationId: session.user.organizationId } },
      include: {
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

  return <TestsClient tests={tests as any} projects={projects} />
}
