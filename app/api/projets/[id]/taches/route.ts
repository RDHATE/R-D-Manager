import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notify } from "@/lib/notify"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

  try {
    const { title, description, status, priority, assigneeId, startDate, dueDate, estimatedHours, isRDEligible, parentId } = await req.json()

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        assigneeId: assigneeId || null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        isRDEligible: isRDEligible ?? true,
        parentId: parentId || null,
        projectId: id,
      },
      include: { assignee: { select: { name: true } }, parent: { select: { title: true } } },
    })

    // Notifier l'assigné si ce n'est pas l'auteur
    if (task.assigneeId && task.assigneeId !== session.user.id) {
      await notify({
        userId: task.assigneeId,
        type:   "TASK_ASSIGNED",
        title:  `Tâche assignée : ${task.title}`,
        body:   `${session.user.name} vous a assigné une tâche dans ${project.name}`,
        link:   `/projets/${id}`,
      })
    }

    return NextResponse.json(task)
  } catch {
    return NextResponse.json({ error: "Erreur lors de la création de la tâche." }, { status: 500 })
  }
}
