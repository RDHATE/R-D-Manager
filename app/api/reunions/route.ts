import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")

  const meetings = await prisma.meeting.findMany({
    where: {
      project: { organizationId: session.user.organizationId },
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: { select: { id: true, name: true, code: true } },
      participants: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { date: "desc" },
  })

  return NextResponse.json(meetings)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  try {
    const { projectId, title, date, duration, location, agenda, summary, decisions, problems, nextSteps, participantIds } = await req.json()

    if (!projectId || !title || !date) {
      return NextResponse.json({ error: "Projet, titre et date requis." }, { status: 400 })
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId },
    })
    if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

    const meeting = await prisma.meeting.create({
      data: {
        title,
        date: new Date(date),
        duration: parseInt(duration) || 60,
        location: location || null,
        agenda: agenda || null,
        summary: summary || null,
        decisions: decisions || null,
        problems: problems || null,
        nextSteps: nextSteps || null,
        projectId,
        participants: {
          create: (participantIds as string[] ?? [session.user.id]).map((uid: string) => ({ userId: uid })),
        },
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
    })

    return NextResponse.json(meeting)
  } catch {
    return NextResponse.json({ error: "Erreur lors de la création." }, { status: 500 })
  }
}
