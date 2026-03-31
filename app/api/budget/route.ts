import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")
  const fiscalYear = searchParams.get("fiscalYear")

  if (!projectId) return NextResponse.json({ error: "projectId requis" }, { status: 400 })

  const where: Record<string, unknown> = {
    project: { organizationId: session.user.organizationId },
    projectId,
  }
  if (fiscalYear) where.fiscalYear = parseInt(fiscalYear)

  const lines = await prisma.budgetLine.findMany({
    where,
    orderBy: { category: "asc" },
  })
  return NextResponse.json(lines)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { projectId, category, planned, description, fiscalYear, distributionMode } = await req.json()
  if (!projectId || !category || planned === undefined) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 })
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

  const year = fiscalYear ? parseInt(fiscalYear) : new Date().getFullYear()
  const mode = distributionMode ?? "MONTHLY"

  // Upsert — une seule ligne par catégorie + projet + année fiscale
  const existing = await prisma.budgetLine.findFirst({
    where: { projectId, category, fiscalYear: year },
  })

  if (existing) {
    const updated = await prisma.budgetLine.update({
      where: { id: existing.id },
      data: {
        planned: parseFloat(planned),
        description: description || null,
        distributionMode: mode,
      },
    })
    return NextResponse.json(updated)
  }

  const line = await prisma.budgetLine.create({
    data: {
      projectId,
      category,
      planned: parseFloat(planned),
      description: description || null,
      fiscalYear: year,
      distributionMode: mode,
    },
  })
  return NextResponse.json(line)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 })

  await prisma.budgetLine.deleteMany({
    where: { id, project: { organizationId: session.user.organizationId } },
  })
  return NextResponse.json({ success: true })
}
