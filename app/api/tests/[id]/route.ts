import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

const INCLUDE = {
  project:     { select: { id: true, name: true, code: true } },
  attachments: { select: { id: true, fileName: true, fileUrl: true, mimeType: true } },
}

async function findTest(id: string, orgId: string) {
  return prisma.testExperience.findFirst({
    where: { id, project: { organizationId: orgId } },
  })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const test = await findTest(id, session.user.organizationId)
  if (!test) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    const fields = ["title", "objective", "parameters", "protocol", "results", "conclusion", "resultType", "structuredData"]
    fields.forEach(f => { if (f in body) data[f] = body[f] })

    const updated = await prisma.testExperience.update({ where: { id }, data, include: INCLUDE })
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const test = await findTest(id, session.user.organizationId)
  if (!test) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  await prisma.testExperience.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
