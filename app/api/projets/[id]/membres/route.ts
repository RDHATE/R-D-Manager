import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notify } from "@/lib/notify"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  // Utilisateurs de l'org qui ne sont pas encore dans ce projet
  const members = await prisma.projectMember.findMany({ where: { projectId: id }, select: { userId: true } })
  const memberIds = members.map((m) => m.userId)

  const available = await prisma.user.findMany({
    where: { organizationId: session.user.organizationId, id: { notIn: memberIds } },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json(available)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

  try {
    const { userId, role } = await req.json()

    const member = await prisma.projectMember.create({
      data: { projectId: id, userId, role: role || "Membre" },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    // Notifier le membre ajouté
    if (userId !== session.user.id) {
      await notify({
        userId,
        type:  "MEMBER_ADDED",
        title: `Ajouté au projet ${project.name}`,
        body:  `${session.user.name} vous a ajouté au projet ${project.code}`,
        link:  `/projets/${id}`,
      })
    }

    return NextResponse.json(member)
  } catch {
    return NextResponse.json({ error: "Ce membre est déjà dans le projet." }, { status: 400 })
  }
}
