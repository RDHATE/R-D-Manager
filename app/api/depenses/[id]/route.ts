import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const expense = await prisma.expense.findFirst({
    where: { id, project: { organizationId: session.user.organizationId } },
  })
  if (!expense) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  const fields = ["description", "amount", "date", "category", "supplier", "invoiceRef", "srdeEligibility", "srdePercentage", "notes"]
  fields.forEach(f => {
    if (body[f] !== undefined) {
      if (f === "amount") data[f] = parseFloat(body[f])
      else if (f === "date") data[f] = new Date(body[f])
      else if (f === "srdePercentage") data[f] = body[f] ? parseFloat(body[f]) : null
      else data[f] = body[f]
    }
  })

  const updated = await prisma.expense.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const expense = await prisma.expense.findFirst({
    where: { id, project: { organizationId: session.user.organizationId } },
  })
  if (!expense) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  await prisma.expense.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
