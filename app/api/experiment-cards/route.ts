import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** GET — toutes les experiment cards de l'organisation */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const cards = await prisma.experimentCard.findMany({
    where: { project: { organizationId: session.user.organizationId } },
    include: {
      project:       { select: { id: true, name: true, code: true } },
      assignee:      { select: { id: true, name: true } },
      sprint:        { select: { id: true, title: true } },
      hypothesis:    { select: { id: true, title: true } },
      pivots:        { select: { id: true } },
      _count:        { select: { journalEntries: true, attachments: true } },
    },
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(cards)
}
