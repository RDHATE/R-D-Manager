import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

  const { arcStatus } = await req.json()
  if (!arcStatus) return NextResponse.json({ error: "arcStatus requis" }, { status: 400 })

  const updated = await prisma.project.update({
    where: { id },
    data: { arcStatus },
    select: { id: true, arcStatus: true },
  })

  return NextResponse.json(updated)
}
