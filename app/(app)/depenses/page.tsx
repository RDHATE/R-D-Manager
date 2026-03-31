import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { DepensesClient } from "./depenses-client"

export default async function DepensesPage() {
  const session = await requireAuth()

  const [projects, expenses, budgetLines] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: session.user.organizationId },
      select: {
        id: true, name: true, code: true,
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.expense.findMany({
      where: { project: { organizationId: session.user.organizationId } },
      include: { project: { select: { id: true, name: true, code: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.budgetLine.findMany({
      where: { project: { organizationId: session.user.organizationId } },
      orderBy: { category: "asc" },
    }),
  ])

  return (
    <DepensesClient
      projects={projects as any}
      expenses={expenses as any}
      budgetLines={budgetLines as any}
      currentUserRole={session.user.role}
    />
  )
}
