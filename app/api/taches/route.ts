import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId  = searchParams.get("projectId")
  const status     = searchParams.get("status")
  const assigneeId = searchParams.get("assigneeId")

  const tasks = await prisma.task.findMany({
    where: {
      project: { organizationId: session.user.organizationId },
      ...(projectId  ? { projectId }      : {}),
      ...(status     ? { status: status as any } : {}),
      ...(assigneeId ? { assigneeId }     : {}),
      parentId: null, // top-level only
    },
    include: {
      project:  { select: { id: true, name: true, code: true } },
      assignee: { select: { id: true, name: true } },
      children: { select: { id: true, status: true } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { sortOrder: "asc" }],
  })

  return NextResponse.json(tasks)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id, status, assigneeId, priority, dueDate } = await req.json()
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })

  const task = await prisma.task.findFirst({
    where: { id, project: { organizationId: session.user.organizationId } },
  })
  if (!task) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(status     !== undefined ? { status, completedAt: status === "DONE" ? new Date() : null } : {}),
      ...(assigneeId !== undefined ? { assigneeId: assigneeId || null } : {}),
      ...(priority   !== undefined ? { priority }   : {}),
      ...(dueDate    !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
    },
    include: {
      project:  { select: { id: true, name: true, code: true } },
      assignee: { select: { id: true, name: true } },
      children: { select: { id: true, status: true } },
    },
  })

  return NextResponse.json(updated)
}
