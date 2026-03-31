import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string; delivId: string }> }

// PATCH — mettre à jour un livrable (complétion, date, label)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { delivId } = await params

  try {
    const body = await req.json()
    const deliverable = await prisma.gateDeliverable.update({
      where: { id: delivId },
      data: {
        ...(body.label       !== undefined && { label: body.label }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.completed   !== undefined && {
          completed: body.completed,
          completedAt: body.completed ? new Date() : null,
        }),
        ...(body.dueDate !== undefined && {
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
        }),
      },
    })
    return NextResponse.json(deliverable)
  } catch (err) {
    console.error("[PATCH /deliverables/:id]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE — supprimer un livrable personnalisé
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { delivId } = await params

  await prisma.gateDeliverable.delete({ where: { id: delivId } })
  return NextResponse.json({ ok: true })
}
