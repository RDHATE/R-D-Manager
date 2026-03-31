import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; hypothesisId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id, hypothesisId } = await params

  const hypothesis = await prisma.hypothesis.findFirst({
    where: { id: hypothesisId, project: { id, organizationId: session.user.organizationId } },
  })
  if (!hypothesis) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.status !== undefined) data.status = body.status
  if (body.pivotReason !== undefined) data.pivotReason = body.pivotReason
  if (body.title !== undefined) data.title = body.title
  if (body.description !== undefined) data.description = body.description

  const updated = await prisma.hypothesis.update({ where: { id: hypothesisId }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; hypothesisId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id, hypothesisId } = await params

  const hypothesis = await prisma.hypothesis.findFirst({
    where: { id: hypothesisId, project: { id, organizationId: session.user.organizationId } },
  })
  if (!hypothesis) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  await prisma.hypothesis.delete({ where: { id: hypothesisId } })
  return NextResponse.json({ success: true })
}
