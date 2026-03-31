import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ entryId: string }> }

/** POST — enregistrer une pièce jointe après upload Supabase */
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { entryId } = await params
  const { fileName, fileUrl, fileSize, mimeType } = await req.json()

  // Vérifier que l'entrée appartient à l'org
  const entry = await prisma.journalEntry.findFirst({
    where: { id: entryId, project: { organizationId: session.user.organizationId } },
  })
  if (!entry) return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 })

  const attachment = await prisma.attachment.create({
    data: { fileName, fileUrl, fileSize: fileSize ?? null, mimeType: mimeType ?? null, journalEntryId: entryId },
  })

  return NextResponse.json(attachment, { status: 201 })
}

/** GET — récupérer les pièces jointes d'une entrée */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { entryId } = await params
  const attachments = await prisma.attachment.findMany({ where: { journalEntryId: entryId } })
  return NextResponse.json(attachments)
}
