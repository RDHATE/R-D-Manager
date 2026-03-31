import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

// GET — liste des sprints du projet
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const sprints = await prisma.sprint.findMany({
    where: { projectId: id, project: { organizationId: session.user.organizationId } },
    include: {
      cards: {
        include: {
          assignee: { select: { id: true, name: true } },
          pivots:   { select: { id: true } },
          _count:   { select: { journalEntries: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { startDate: "asc" },
  })
  return NextResponse.json(sprints)
}

// POST — créer un sprint
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  try {
    const body = await req.json()
    const sprint = await prisma.sprint.create({
      data: {
        title:     body.title,
        goal:      body.goal      || null,
        startDate: new Date(body.startDate),
        endDate:   new Date(body.endDate),
        capacity:  body.capacity  ? parseFloat(body.capacity) : null,
        projectId: id,
      },
      include: { cards: true },
    })
    return NextResponse.json(sprint, { status: 201 })
  } catch (err) {
    console.error("[POST /sprints]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
