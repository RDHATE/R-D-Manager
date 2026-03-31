import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET — mes notifications (50 dernières)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const onlyUnread = searchParams.get("unread") === "1"

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      ...(onlyUnread ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  })

  return NextResponse.json({ notifications, unreadCount })
}

// POST — créer une notification (usage interne serveur via helper)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  // Seuls admin/PM peuvent créer des notifs manuellement
  if (session.user.role !== "ADMIN" && session.user.role !== "PROJECT_MANAGER") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const { userId, type, title, body, link } = await req.json()
  const notif = await prisma.notification.create({
    data: { userId, type, title, body, link },
  })
  return NextResponse.json(notif)
}

// PATCH — marquer tout comme lu
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
