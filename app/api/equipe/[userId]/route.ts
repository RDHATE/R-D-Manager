import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ userId: string }> }

/** PATCH — modifier un membre (capacity, hourlyRate) — admin/PM only */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "PROJECT_MANAGER") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const { userId } = await params
  const body = await req.json()

  // Vérifier que le user est dans la même organisation
  const member = await prisma.user.findFirst({
    where: { id: userId, organizationId: session.user.organizationId },
  })
  if (!member) return NextResponse.json({ error: "Membre introuvable" }, { status: 404 })

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(body.weeklyCapacity !== undefined ? { weeklyCapacity: parseFloat(body.weeklyCapacity) } : {}),
      ...(body.hourlyRate     !== undefined ? { hourlyRate: parseFloat(body.hourlyRate) }         : {}),
    },
    select: { id: true, name: true, weeklyCapacity: true, hourlyRate: true },
  })

  return NextResponse.json(updated)
}
