import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const meeting = await prisma.meeting.findFirst({
    where: { id, project: { organizationId: session.user.organizationId } },
  })
  if (!meeting) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  const fields = ["title", "date", "duration", "location", "agenda", "summary", "decisions", "problems", "nextSteps"]
  fields.forEach(f => { if (body[f] !== undefined) data[f] = f === "date" ? new Date(body[f]) : body[f] })

  const updated = await prisma.meeting.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const meeting = await prisma.meeting.findFirst({
    where: { id, project: { organizationId: session.user.organizationId } },
  })
  if (!meeting) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  await prisma.meeting.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
