import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notify } from "@/lib/notify"

/**
 * POST /api/taches/overdue
 * Vérifie les tâches en retard assignées à l'utilisateur courant
 * et crée une notification TASK_OVERDUE si pas déjà notifié dans les 24h.
 * Appelé silencieusement au chargement du dashboard.
 */
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const now       = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Tâches en retard assignées à cet utilisateur (non terminées, date dépassée)
  const overdueTasks = await prisma.task.findMany({
    where: {
      assigneeId: session.user.id,
      dueDate:    { lt: now },
      status:     { notIn: ["DONE", "ABANDONED"] },
      project:    { organizationId: session.user.organizationId },
    },
    select: { id: true, title: true, dueDate: true, project: { select: { id: true, name: true } } },
    take: 20,
  })

  if (overdueTasks.length === 0) return NextResponse.json({ notified: 0 })

  // Notifs TASK_OVERDUE déjà envoyées dans les 24h pour éviter le spam
  const recentNotifs = await prisma.notification.findMany({
    where: {
      userId:    session.user.id,
      type:      "TASK_OVERDUE",
      createdAt: { gte: yesterday },
    },
    select: { title: true },
  })
  const alreadyNotified = new Set(recentNotifs.map(n => n.title))

  let notified = 0
  for (const task of overdueTasks) {
    const notifTitle = `Tâche en retard : ${task.title}`
    if (alreadyNotified.has(notifTitle)) continue

    const daysLate = Math.floor((now.getTime() - new Date(task.dueDate!).getTime()) / 86400000)
    await notify({
      userId: session.user.id,
      type:   "TASK_OVERDUE",
      title:  notifTitle,
      body:   `En retard de ${daysLate} jour${daysLate > 1 ? "s" : ""} — ${task.project.name}`,
      link:   `/projets/${task.project.id}`,
    })
    notified++
  }

  return NextResponse.json({ notified })
}
