import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string; sprintId: string }> }

// PATCH — modifier un sprint (titre, dates, statut, rétro)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id, sprintId } = await params
  const body = await req.json()

  const sprint = await prisma.sprint.update({
    where: { id: sprintId, projectId: id },
    data: {
      ...(body.title        !== undefined && { title: body.title }),
      ...(body.goal         !== undefined && { goal: body.goal }),
      ...(body.startDate    !== undefined && { startDate: new Date(body.startDate) }),
      ...(body.endDate      !== undefined && { endDate: new Date(body.endDate) }),
      ...(body.status       !== undefined && { status: body.status }),
      ...(body.capacity     !== undefined && { capacity: body.capacity ? parseFloat(body.capacity) : null }),
      ...(body.retroLessons !== undefined && { retroLessons: body.retroLessons }),
      ...(body.retroPivot   !== undefined && { retroPivot: body.retroPivot }),
    },
  })
  return NextResponse.json(sprint)
}

// DELETE — supprimer un sprint
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id, sprintId } = await params

  await prisma.sprint.delete({ where: { id: sprintId, projectId: id } })
  return NextResponse.json({ ok: true })
}
