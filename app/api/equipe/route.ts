import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const members = await prisma.user.findMany({
    where: { organizationId: session.user.organizationId },
    select: {
      id: true, name: true, email: true, role: true, hourlyRate: true, createdAt: true,
      _count: { select: { timeEntries: true, assignedTasks: true } },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(members)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Seul un administrateur peut ajouter des membres." }, { status: 403 })
  }

  try {
    const { name, email, password, role, hourlyRate } = await req.json()

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: role || "MEMBER",
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        organizationId: session.user.organizationId,
      },
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: "Erreur lors de la création du membre." }, { status: 500 })
  }
}
