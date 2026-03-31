import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")
  const userId    = searchParams.get("userId")
  const from      = searchParams.get("from")
  const to        = searchParams.get("to")

  const entries = await prisma.timeEntry.findMany({
    where: {
      project: { organizationId: session.user.organizationId },
      ...(projectId ? { projectId } : {}),
      ...(userId    ? { userId }    : {}),
      ...(from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    },
    include: {
      user:    { select: { id: true, name: true } },
      project: { select: { id: true, name: true, code: true } },
      task:    { select: { id: true, title: true } },
    },
    orderBy: { date: "desc" },
  })

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  try {
    const { projectId, taskId, date, hours, description, category, userId: bodyUserId } = await req.json()

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId },
    })
    if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

    // Un admin/PM peut saisir pour un autre membre
    const targetUserId = (bodyUserId && (session.user.role === "ADMIN" || session.user.role === "PROJECT_MANAGER"))
      ? bodyUserId
      : session.user.id

    const entry = await prisma.timeEntry.create({
      data: {
        date:        new Date(date),
        hours:       parseFloat(hours),
        description,
        category:    category || "RD_DIRECT",
        userId:      targetUserId,
        projectId,
        taskId:      taskId || null,
      },
      include: {
        user:    { select: { id: true, name: true } },
        project: { select: { id: true, name: true, code: true } },
        task:    { select: { id: true, title: true } },
      },
    })

    return NextResponse.json(entry)
  } catch {
    return NextResponse.json({ error: "Erreur lors de la saisie." }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 })

  const entry = await prisma.timeEntry.findFirst({
    where: { id, project: { organizationId: session.user.organizationId } },
  })
  if (!entry) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  // Seul le propriétaire ou un admin peut supprimer
  if (entry.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  await prisma.timeEntry.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
