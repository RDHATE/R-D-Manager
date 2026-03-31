import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

  const hypotheses = await prisma.hypothesis.findMany({
    where: { projectId: id },
    orderBy: [{ status: "asc" }, { version: "desc" }],
  })

  return NextResponse.json(hypotheses)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

  const { title, description, archivePreviousId, pivotReason } = await req.json()

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Titre et description requis." }, { status: 400 })
  }

  // Calculer le prochain numéro de version
  const lastHypothesis = await prisma.hypothesis.findFirst({
    where: { projectId: id },
    orderBy: { version: "desc" },
  })
  const nextVersion = (lastHypothesis?.version ?? 0) + 1

  // Si on archive la précédente (création d'une nouvelle version), on l'archive ou l'abandonne
  if (archivePreviousId) {
    await prisma.hypothesis.update({
      where: { id: archivePreviousId },
      data: {
        status: pivotReason ? "ABANDONED" : "ARCHIVED",
        pivotReason: pivotReason || null,
      },
    })
  }

  const hypothesis = await prisma.hypothesis.create({
    data: {
      title,
      description,
      version: nextVersion,
      status: "ACTIVE",
      projectId: id,
    },
  })

  return NextResponse.json(hypothesis)
}
