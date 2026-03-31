import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import {
  FolderKanban, CheckSquare, Clock, DollarSign,
  AlertTriangle, BookOpen,
} from "lucide-react"
import { DashboardClient } from "./dashboard-client"

export default async function DashboardPage() {
  const session = await requireAuth()
  const orgId = session.user.organizationId
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    projects, myTasks, overdueCount, hoursMonth,
    pendingApprovals, expenses, budgetLines,
    journalCount, testsCount, recentJournal,
    totalTaskCount, doneTaskCount, tasksByStatus, projectsByStatus,
  ] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { tasks: true, members: true } } },
      orderBy: { updatedAt: "desc" }, take: 6,
    }),
    prisma.task.findMany({
      where: {
        project: { organizationId: orgId },
        status: { notIn: ["DONE", "ABANDONED"] },
        assigneeId: session.user.id,
      },
      include: { project: { select: { name: true, code: true, id: true } } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }], take: 6,
    }),
    prisma.task.count({
      where: { project: { organizationId: orgId }, status: { notIn: ["DONE", "ABANDONED"] }, dueDate: { lt: now } },
    }),
    prisma.timeEntry.aggregate({
      where: { project: { organizationId: orgId }, date: { gte: monthStart } },
      _sum: { hours: true },
    }),
    prisma.expense.count({ where: { project: { organizationId: orgId }, status: "PENDING" } }),
    prisma.expense.aggregate({ where: { project: { organizationId: orgId }, status: "APPROVED" }, _sum: { amount: true } }),
    prisma.budgetLine.aggregate({ where: { project: { organizationId: orgId } }, _sum: { planned: true } }),
    prisma.journalEntry.count({ where: { project: { organizationId: orgId }, createdAt: { gte: monthStart } } }),
    prisma.testExperience.count({ where: { project: { organizationId: orgId } } }),
    prisma.journalEntry.findMany({
      where: { project: { organizationId: orgId } },
      include: { project: { select: { code: true } }, author: { select: { name: true } } },
      orderBy: { createdAt: "desc" }, take: 4,
    }),
    prisma.task.count({ where: { project: { organizationId: orgId } } }),
    prisma.task.count({ where: { project: { organizationId: orgId }, status: "DONE" } }),
    prisma.task.groupBy({ by: ["status"], where: { project: { organizationId: orgId } }, _count: true }),
    prisma.project.groupBy({ by: ["status"], where: { organizationId: orgId }, _count: true }),
  ])

  const activeProjects = projects.filter((p: any) => p.status === "ACTIVE").length
  const totalHours = hoursMonth._sum.hours ?? 0
  const totalSpent = expenses._sum.amount ?? 0
  const totalBudget = budgetLines._sum.planned ?? 0
  const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : null
  const taskCompletionPct = totalTaskCount > 0 ? Math.round((doneTaskCount / totalTaskCount) * 100) : 0

  const STATUS_LABELS: Record<string, string> = { DRAFT: "Brouillon", ACTIVE: "Actif", COMPLETED: "Terminé", ARCHIVED: "Archivé" }
  const ARC_LABELS: Record<string, string> = {
    DRAFT: "Brouillon", HYPOTHESIS_DEFINED: "Hypothèses", IN_EXPERIMENTATION: "Expérimentation",
    ANALYZING_RESULTS: "Analyse", ADVANCEMENT_REACHED: "Avancement", CLOSED: "Fermé",
  }
  const PRIORITY_COLORS: Record<string, string> = {
    LOW: "#64748b", MEDIUM: "#3b82f6", HIGH: "#f97316", CRITICAL: "#ef4444",
  }
  const TASK_STATUS_LABELS: Record<string, string> = {
    TODO: "À faire", IN_PROGRESS: "En cours", IN_REVIEW: "En révision", BLOCKED: "Bloqué", DONE: "Terminé", ABANDONED: "Abandonné",
  }
  const TASK_STATUS_NEON: Record<string, string> = {
    TODO: "#64748b", IN_PROGRESS: "#3b82f6", IN_REVIEW: "#f59e0b", BLOCKED: "#ef4444", DONE: "#10b981", ABANDONED: "#6b7280",
  }
  const JOURNAL_TYPES: Record<string, { label: string; color: string }> = {
    OBSERVATION: { label: "Observation", color: "#3b82f6" },
    DISCOVERY: { label: "Découverte", color: "#8b5cf6" },
    PROBLEM: { label: "Problème", color: "#ef4444" },
    DECISION: { label: "Décision", color: "#f97316" },
    DIRECTION_CHANGE: { label: "Pivot", color: "#f59e0b" },
    TEST_RESULT: { label: "Résultat", color: "#10b981" },
    GENERAL: { label: "Note", color: "#64748b" },
  }
  const PROJECT_STATUS_NEON: Record<string, string> = {
    ACTIVE: "#06b6d4",
    DRAFT: "#64748b",
    COMPLETED: "#10b981",
    ARCHIVED: "#6b7280",
  }

  const kpis = [
    {
      label: "Projets actifs",
      value: activeProjects,
      sub: `${projects.length} au total`,
      color: "#3b82f6",
      icon: <FolderKanban className="h-5 w-5" />,
      href: "/projets",
    },
    {
      label: "Mes tâches",
      value: myTasks.length,
      sub: overdueCount > 0 ? `${overdueCount} en retard` : "À jour",
      subColor: overdueCount > 0 ? "#ef4444" : "#10b981",
      color: "#8b5cf6",
      icon: <CheckSquare className="h-5 w-5" />,
      href: "/taches?assignee=me",
    },
    {
      label: "Heures RS&DE",
      value: totalHours.toFixed(1),
      sub: "ce mois",
      color: "#06b6d4",
      icon: <Clock className="h-5 w-5" />,
      href: "/saisie-temps",
    },
    {
      label: "Dépenses approuvées",
      value: totalSpent.toLocaleString("fr-CA", { maximumFractionDigits: 0 }) + " $",
      sub: budgetPct !== null ? `${budgetPct}% du budget` : "Aucun budget",
      subColor: (budgetPct ?? 0) >= 100 ? "#ef4444" : (budgetPct ?? 0) >= 90 ? "#f97316" : "#10b981",
      color: "#10b981",
      icon: <DollarSign className="h-5 w-5" />,
      href: "/depenses",
    },
    {
      label: "Journal de bord",
      value: journalCount,
      sub: "entrées ce mois",
      color: "#f97316",
      icon: <BookOpen className="h-5 w-5" />,
      href: "/journal",
    },
    {
      label: "Approbations",
      value: pendingApprovals,
      sub: pendingApprovals > 0 ? "en attente !" : "Aucune en attente",
      subColor: pendingApprovals > 0 ? "#ef4444" : "#10b981",
      color: pendingApprovals > 0 ? "#ef4444" : "#64748b",
      icon: <AlertTriangle className="h-5 w-5" />,
      href: "/depenses?tab=approbations",
    },
  ]

  // Normalize groupBy results for serialization
  const normalizedProjectsByStatus = projectsByStatus.map(s => ({ status: s.status, _count: s._count }))
  const normalizedTasksByStatus = tasksByStatus.map(s => ({ status: s.status, _count: s._count }))

  return (
    <DashboardClient
      kpis={kpis as any}
      projects={projects as any}
      myTasks={myTasks as any}
      recentJournal={recentJournal as any}
      totalTaskCount={totalTaskCount}
      doneTaskCount={doneTaskCount}
      overdueCount={overdueCount}
      pendingApprovals={pendingApprovals}
      testsCount={testsCount}
      journalCount={journalCount}
      totalSpent={totalSpent}
      totalBudget={totalBudget}
      budgetPct={budgetPct}
      totalHours={totalHours}
      activeProjects={activeProjects}
      taskCompletionPct={taskCompletionPct}
      STATUS_LABELS={STATUS_LABELS}
      TASK_STATUS_LABELS={TASK_STATUS_LABELS}
      TASK_STATUS_NEON={TASK_STATUS_NEON}
      PROJECT_STATUS_NEON={PROJECT_STATUS_NEON}
      JOURNAL_TYPES={JOURNAL_TYPES}
      PRIORITY_COLORS={PRIORITY_COLORS}
      ARC_LABELS={ARC_LABELS}
      projectsByStatus={normalizedProjectsByStatus}
      tasksByStatus={normalizedTasksByStatus}
      now={now.toISOString()}
      userName={session.user.name ?? ""}
    />
  )
}
