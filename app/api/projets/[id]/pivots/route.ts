import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notifyMany } from "@/lib/notify"

type Ctx = { params: Promise<{ id: string }> }

// GET — tous les pivots du projet (pour l'arbre de décision)
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const pivots = await prisma.pivot.findMany({
    where: { projectId: id, project: { organizationId: session.user.organizationId } },
    include: {
      experimentCard: { select: { id: true, title: true, status: true } },
      createdBy:      { select: { id: true, name: true } },
      childPivots:    { include: { experimentCard: { select: { id: true, title: true } } } },
    },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(pivots)
}

// POST — créer un pivot (depuis une experiment card)
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const pivot = await prisma.pivot.create({
    data: {
      reason:          body.reason,
      oldDirection:    body.oldDirection,
      newDirection:    body.newDirection,
      lessons:         body.lessons         || null,
      budgetImpact:    body.budgetImpact    || null,
      timelineImpact:  body.timelineImpact  || null,
      projectId:       id,
      experimentCardId:body.experimentCardId|| null,
      parentPivotId:   body.parentPivotId   || null,
      createdById:     session.user.id,
    },
    include: {
      experimentCard: { select: { id: true, title: true } },
      createdBy:      { select: { name: true } },
    },
  })

  // Marquer la card comme PIVOTED si liée
  if (body.experimentCardId) {
    await prisma.experimentCard.update({
      where: { id: body.experimentCardId },
      data:  { status: "PIVOTED" },
    })
  }

  // Notifier tous les membres du projet
  const projectMembers = await prisma.projectMember.findMany({
    where:  { projectId: id },
    select: { userId: true },
  })
  const memberIds = projectMembers.map(m => m.userId).filter(uid => uid !== session.user.id)
  if (memberIds.length > 0) {
    const project = await prisma.project.findUnique({ where: { id }, select: { name: true } })
    await notifyMany(memberIds, {
      type:  "PIVOT_CREATED",
      title: `Pivot créé — ${project?.name ?? "projet"}`,
      body:  `${session.user.name} a enregistré un nouveau pivot R&D`,
      link:  `/projets/${id}`,
    })
  }

  return NextResponse.json(pivot, { status: 201 })
}
