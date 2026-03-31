import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const INCLUDE = {
  project:     { select: { id: true, name: true, code: true } },
  attachments: { select: { id: true, fileName: true, fileUrl: true, mimeType: true } },
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")

  const tests = await prisma.testExperience.findMany({
    where: { project: { organizationId: session.user.organizationId }, ...(projectId ? { projectId } : {}) },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(tests)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  try {
    const { projectId, title, objective, parameters, protocol, results, conclusion, resultType, structuredData } = await req.json()
    if (!projectId || !title || !objective)
      return NextResponse.json({ error: "Projet, titre et objectif requis." }, { status: 400 })

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId },
    })
    if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

    const test = await prisma.testExperience.create({
      data: {
        title, objective,
        parameters:     parameters     || null,
        protocol:       protocol       || null,
        results:        results        || null,
        conclusion:     conclusion     || null,
        resultType:     resultType     || null,
        structuredData: structuredData ?? null,
        projectId,
      },
      include: INCLUDE,
    })
    return NextResponse.json(test, { status: 201 })
  } catch (err) {
    console.error("[POST /tests]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
