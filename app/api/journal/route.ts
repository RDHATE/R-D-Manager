import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")
  const type      = searchParams.get("type")
  const tag       = searchParams.get("tag")

  const entries = await prisma.journalEntry.findMany({
    where: {
      project: { organizationId: session.user.organizationId },
      ...(projectId ? { projectId } : {}),
      ...(type      ? { type: type as any } : {}),
      ...(tag       ? { tags: { has: tag } } : {}),
    },
    include: {
      author:  { select: { id: true, name: true } },
      project: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  try {
    const { projectId, type, title, content, structuredData, tags, signedBy } = await req.json()

    if (!projectId || !content?.trim())
      return NextResponse.json({ error: "Projet et contenu requis." }, { status: 400 })

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId },
    })
    if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

    const entry = await prisma.journalEntry.create({
      data: {
        type:           type || "GENERAL",
        title:          title?.trim() || null,
        content:        content.trim(),
        structuredData: structuredData ?? null,
        tags:           Array.isArray(tags) ? tags.filter(Boolean) : [],
        signedBy:       signedBy?.trim() || null,
        signedAt:       signedBy?.trim() ? new Date() : null,
        projectId,
        authorId:       session.user.id,
      },
      include: {
        author:  { select: { id: true, name: true } },
        project: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (err) {
    console.error("[POST /journal]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
