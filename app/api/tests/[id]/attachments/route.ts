import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const test = await prisma.testExperience.findFirst({
    where: { id, project: { organizationId: session.user.organizationId } },
  })
  if (!test) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const { fileName, fileUrl, fileSize, mimeType } = await req.json()
  const attachment = await prisma.attachment.create({
    data: { fileName, fileUrl, fileSize: fileSize ?? null, mimeType: mimeType ?? null, testExperienceId: id },
  })
  return NextResponse.json(attachment, { status: 201 })
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const attachments = await prisma.attachment.findMany({ where: { testExperienceId: id } })
  return NextResponse.json(attachments)
}
