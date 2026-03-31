import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id, taskId } = await params
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId: id, project: { organizationId: session.user.organizationId } },
    include: {
      assignee:     { select: { id: true, name: true } },
      children:     { select: { id: true, title: true, status: true, isMilestone: true } },
      predecessors: { include: { predecessor: { select: { id: true, title: true, dueDate: true } } } },
      successors:   { include: { successor:   { select: { id: true, title: true, startDate: true } } } },
    },
  })
  if (!task) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 })
  return NextResponse.json(task)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id, taskId } = await params

  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId: id, project: { organizationId: session.user.organizationId } },
  })
  if (!task) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 })

  try {
    const body = await req.json()

    // Whitelist updatable fields to prevent injection
    const {
      title, description, status, priority, arcType, isRDEligible,
      abandonReason, estimatedHours, startDate, dueDate, completedAt,
      sortOrder, assigneeId, parentId, customData,
      isMilestone,  // type conversion
    } = body

    const data: Record<string, unknown> = {}
    if (title         !== undefined) data.title         = title
    if (description   !== undefined) data.description   = description || null
    if (status        !== undefined) { data.status = status; if (status === "DONE") data.completedAt = new Date(); else if (completedAt === null) data.completedAt = null }
    if (priority      !== undefined) data.priority      = priority
    if (arcType       !== undefined) data.arcType       = arcType
    if (isRDEligible  !== undefined) data.isRDEligible  = isRDEligible
    if (abandonReason !== undefined) data.abandonReason = abandonReason || null
    if (estimatedHours !== undefined) data.estimatedHours = estimatedHours ? parseFloat(estimatedHours) : null
    if (startDate     !== undefined) data.startDate     = startDate ? new Date(startDate) : null
    if (dueDate       !== undefined) data.dueDate       = dueDate   ? new Date(dueDate)   : null
    if (sortOrder     !== undefined) data.sortOrder     = sortOrder
    if (assigneeId    !== undefined) data.assigneeId    = assigneeId || null
    if (customData    !== undefined) data.customData    = customData

    // Type conversion: parentId (null = promote to top-level)
    if (parentId !== undefined) {
      if (parentId === null || parentId === "") {
        data.parentId = null
      } else {
        // verify parent belongs to same project
        const parent = await prisma.task.findFirst({ where: { id: parentId, projectId: id } })
        if (!parent) return NextResponse.json({ error: "Tâche parente introuvable" }, { status: 404 })
        data.parentId = parentId
      }
    }

    // isMilestone: convert type
    if (isMilestone !== undefined) {
      data.isMilestone = !!isMilestone
      // When converting to milestone: clear parentId, set dueDate if missing
      if (isMilestone) { data.parentId = null }
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        assignee:     { select: { id: true, name: true } },
        children:     { select: { id: true, title: true, status: true, isMilestone: true } },
        predecessors: { include: { predecessor: { select: { id: true, title: true, dueDate: true } } } },
        successors:   { include: { successor:   { select: { id: true, title: true, startDate: true } } } },
      },
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Erreur de mise à jour." }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id, taskId } = await params
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId: id, project: { organizationId: session.user.organizationId } },
  })
  if (!task) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 })

  await prisma.task.delete({ where: { id: taskId } })
  return NextResponse.json({ success: true })
}
