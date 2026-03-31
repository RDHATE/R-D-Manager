import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

/** PATCH — modifier une entrée de temps (propriétaire ou admin) */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const entry = await prisma.timeEntry.findFirst({
    where: { id, project: { organizationId: session.user.organizationId } },
  })
  if (!entry) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  if (entry.userId !== session.user.id && session.user.role !== "ADMIN" && session.user.role !== "PROJECT_MANAGER") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const body = await req.json()
  const updated = await prisma.timeEntry.update({
    where: { id },
    data: {
      ...(body.date        ? { date: new Date(body.date) } : {}),
      ...(body.hours       ? { hours: parseFloat(body.hours) } : {}),
      ...(body.description ? { description: body.description } : {}),
      ...(body.category    ? { category: body.category } : {}),
      ...(body.taskId !== undefined ? { taskId: body.taskId || null } : {}),
    },
    include: {
      user:    { select: { id: true, name: true } },
      project: { select: { id: true, name: true, code: true } },
      task:    { select: { id: true, title: true } },
    },
  })

  return NextResponse.json(updated)
}

/** DELETE — supprimer une entrée (propriétaire ou admin) */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const entry = await prisma.timeEntry.findFirst({
    where: { id, project: { organizationId: session.user.organizationId } },
  })
  if (!entry) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  if (entry.userId !== session.user.id && session.user.role !== "ADMIN" && session.user.role !== "PROJECT_MANAGER") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  await prisma.timeEntry.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
