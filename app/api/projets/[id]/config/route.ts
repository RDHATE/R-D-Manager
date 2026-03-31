import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const DEFAULT_STATUSES = [
  { id: "TODO", label: "À faire", color: "slate" },
  { id: "IN_PROGRESS", label: "En cours", color: "blue" },
  { id: "IN_REVIEW", label: "En révision", color: "amber" },
  { id: "DONE", label: "Terminé", color: "green" },
  { id: "BLOCKED", label: "Bloqué", color: "red" },
]

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: { statusConfig: true },
  })

  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

  const statuses = (project.statusConfig as typeof DEFAULT_STATUSES | null) ?? DEFAULT_STATUSES
  return NextResponse.json({ statuses })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
  })
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

  const data: Record<string, any> = {}
  if (body.statuses !== undefined) data.statusConfig = body.statuses
  if (body.customColumns !== undefined) data.customColumns = body.customColumns

  await prisma.project.update({ where: { id }, data })

  return NextResponse.json({ success: true })
}
