import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

  try {
    const { title, description, dueDate } = await req.json()

    const milestone = await prisma.milestone.create({
      data: {
        title,
        description: description || null,
        dueDate: new Date(dueDate),
        projectId: id,
      },
    })

    return NextResponse.json(milestone)
  } catch {
    return NextResponse.json({ error: "Erreur lors de la création du jalon." }, { status: 500 })
  }
}
