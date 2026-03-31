import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST — créer une dépendance
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id: projectId } = await params
  const { predecessorId, successorId, type, lag } = await req.json()

  if (!predecessorId || !successorId)
    return NextResponse.json({ error: "predecessorId et successorId requis" }, { status: 400 })
  if (predecessorId === successorId)
    return NextResponse.json({ error: "Une tâche ne peut pas dépendre d'elle-même" }, { status: 400 })

  // Verify both tasks belong to this project
  const [pred, succ] = await Promise.all([
    prisma.task.findFirst({ where: { id: predecessorId, projectId, project: { organizationId: session.user.organizationId } } }),
    prisma.task.findFirst({ where: { id: successorId,   projectId, project: { organizationId: session.user.organizationId } } }),
  ])
  if (!pred || !succ) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 })

  const dep = await prisma.taskDependency.upsert({
    where:  { predecessorId_successorId: { predecessorId, successorId } },
    create: { predecessorId, successorId, type: type ?? "FINISH_TO_START", lag: lag ?? 0 },
    update: { type: type ?? "FINISH_TO_START", lag: lag ?? 0 },
    include: {
      predecessor: { select: { id: true, title: true } },
      successor:   { select: { id: true, title: true } },
    },
  })

  return NextResponse.json(dep)
}

// DELETE — supprimer une dépendance
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id: projectId } = await params
  const { predecessorId, successorId } = await req.json()

  // Verify ownership
  const pred = await prisma.task.findFirst({
    where: { id: predecessorId, projectId, project: { organizationId: session.user.organizationId } },
  })
  if (!pred) return NextResponse.json({ error: "Non autorisé" }, { status: 403 })

  await prisma.taskDependency.deleteMany({ where: { predecessorId, successorId } })
  return NextResponse.json({ success: true })
}
