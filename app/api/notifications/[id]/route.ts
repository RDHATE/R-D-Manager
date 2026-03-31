import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH — marquer une notif comme lue
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  const notif = await prisma.notification.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!notif) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  })
  return NextResponse.json(updated)
}

// DELETE — supprimer une notif
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  const notif = await prisma.notification.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!notif) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  await prisma.notification.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
