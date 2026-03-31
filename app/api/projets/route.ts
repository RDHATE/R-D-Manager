import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  // Léger endpoint pour le timer flottant
  const projects = await prisma.project.findMany({
    where: { organizationId: session.user.organizationId, status: "ACTIVE" },
    select: {
      id: true, name: true, code: true,
      tasks: { select: { id: true, title: true }, orderBy: { title: "asc" } },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  try {
    const {
      name, code, description, startDate, endDate,
      objective, technicalUncertainties, hypotheses,
      acceptanceCriteria, expectedDeliverables,
    } = await req.json()

    const project = await prisma.project.create({
      data: {
        name,
        code,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: "ACTIVE",
        organizationId: session.user.organizationId,
        charter: {
          create: {
            objective,
            technicalUncertainties,
            hypotheses,
            acceptanceCriteria,
            expectedDeliverables,
          },
        },
        members: {
          create: {
            userId: session.user.id,
            role: "Chef de projet",
          },
        },
      },
    })

    return NextResponse.json({ id: project.id })
  } catch {
    return NextResponse.json({ error: "Erreur lors de la création du projet." }, { status: 500 })
  }
}
