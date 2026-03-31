import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

const CARD_INCLUDE = {
  assignee:      { select: { id: true, name: true } },
  sprint:        { select: { id: true, title: true } },
  hypothesis:    { select: { id: true, title: true } },
  pivots:        true,
  journalEntries:{ select: { id: true, type: true, createdAt: true } },
  _count:        { select: { attachments: true } },
}

// GET — toutes les experiment cards du projet
export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const sprintId = searchParams.get("sprintId")

  const cards = await prisma.experimentCard.findMany({
    where: {
      projectId: id,
      project: { organizationId: session.user.organizationId },
      ...(sprintId ? { sprintId } : {}),
    },
    include: CARD_INCLUDE,
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }],
  })
  return NextResponse.json(cards)
}

// POST — créer une experiment card
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const card = await prisma.experimentCard.create({
    data: {
      title:          body.title,
      hypothesisText: body.hypothesisText,
      method:         body.method         || null,
      materials:      body.materials      || null,
      variables:      body.variables      || null,
      expectedResult: body.expectedResult || null,
      estimatedHours: body.estimatedHours ? parseFloat(body.estimatedHours) : null,
      isRDEligible:   body.isRDEligible   ?? true,
      projectId:      id,
      sprintId:       body.sprintId       || null,
      hypothesisId:   body.hypothesisId   || null,
      assigneeId:     body.assigneeId     || null,
    },
    include: CARD_INCLUDE,
  })
  return NextResponse.json(card, { status: 201 })
}
