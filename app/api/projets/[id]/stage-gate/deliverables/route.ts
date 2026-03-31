import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

// POST — créer un livrable personnalisé
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  try {
    const { gate, label, description, dueDate } = await req.json()

    const count = await prisma.gateDeliverable.count({ where: { projectId: id, gate } })

    const deliverable = await prisma.gateDeliverable.create({
      data: {
        projectId: id,
        gate,
        label,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        isCustom: true,
        sortOrder: count,
      },
    })
    return NextResponse.json(deliverable, { status: 201 })
  } catch (err) {
    console.error("[POST /deliverables]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
