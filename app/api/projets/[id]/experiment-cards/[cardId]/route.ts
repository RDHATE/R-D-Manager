import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string; cardId: string }> }

const CARD_INCLUDE = {
  assignee:      { select: { id: true, name: true } },
  sprint:        { select: { id: true, title: true } },
  hypothesis:    { select: { id: true, title: true } },
  pivots:        { include: { createdBy: { select: { name: true } }, childPivots: true } },
  journalEntries:{ include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" as const } },
  attachments:   true,
}

// GET — détail complet d'une card
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id, cardId } = await params

  const card = await prisma.experimentCard.findFirst({
    where: { id: cardId, projectId: id, project: { organizationId: session.user.organizationId } },
    include: CARD_INCLUDE,
  })
  if (!card) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  return NextResponse.json(card)
}

// PATCH — mettre à jour une card (statut, résultats, conclusion, etc.)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id, cardId } = await params
  const body = await req.json()

  const card = await prisma.experimentCard.update({
    where: { id: cardId, projectId: id },
    data: {
      ...(body.title          !== undefined && { title: body.title }),
      ...(body.hypothesisText !== undefined && { hypothesisText: body.hypothesisText }),
      ...(body.method         !== undefined && { method: body.method }),
      ...(body.materials      !== undefined && { materials: body.materials }),
      ...(body.variables      !== undefined && { variables: body.variables }),
      ...(body.expectedResult !== undefined && { expectedResult: body.expectedResult }),
      ...(body.actualResult   !== undefined && { actualResult: body.actualResult }),
      ...(body.conclusion     !== undefined && { conclusion: body.conclusion }),
      ...(body.resultType     !== undefined && { resultType: body.resultType }),
      ...(body.status         !== undefined && { status: body.status }),
      ...(body.sortOrder      !== undefined && { sortOrder: body.sortOrder }),
      ...(body.estimatedHours !== undefined && { estimatedHours: body.estimatedHours ? parseFloat(body.estimatedHours) : null }),
      ...(body.actualHours    !== undefined && { actualHours: body.actualHours ? parseFloat(body.actualHours) : null }),
      ...(body.isRDEligible   !== undefined && { isRDEligible: body.isRDEligible }),
      ...(body.sprintId       !== undefined && { sprintId: body.sprintId }),
      ...(body.assigneeId     !== undefined && { assigneeId: body.assigneeId }),
      ...(body.hypothesisId   !== undefined && { hypothesisId: body.hypothesisId }),
    },
    include: CARD_INCLUDE,
  })
  return NextResponse.json(card)
}

// DELETE
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id, cardId } = await params

  await prisma.experimentCard.delete({ where: { id: cardId, projectId: id } })
  return NextResponse.json({ ok: true })
}
