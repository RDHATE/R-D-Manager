import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const INCLUDE = {
  experimentCard: { select: { id: true, title: true, status: true } },
  createdBy:      { select: { name: true } },
  project:        { select: { id: true, name: true, code: true } },
  childPivots: {
    include: {
      experimentCard: { select: { id: true, title: true, status: true } },
      createdBy:      { select: { name: true } },
      childPivots: {
        include: {
          experimentCard: { select: { id: true, title: true, status: true } },
          createdBy:      { select: { name: true } },
          childPivots:    { include: { experimentCard: { select: { id: true, title: true } }, createdBy: { select: { name: true } }, childPivots: true } },
        },
      },
    },
  },
}

/** GET — tous les pivots de l'organisation (racines seulement) */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")

  const pivots = await prisma.pivot.findMany({
    where: {
      project: { organizationId: session.user.organizationId },
      parentPivotId: null, // racines uniquement
      ...(projectId ? { projectId } : {}),
    },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(pivots)
}
