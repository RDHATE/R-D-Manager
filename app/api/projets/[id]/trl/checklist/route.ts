import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

// POST — ajouter un item personnalisé
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  const { trlLevel, text } = await req.json()
  // trlLevel 1-9 = items NMT, trlLevel 10/20/30/40 = items personnalisés au niveau stade
  const VALID = [1,2,3,4,5,6,7,8,9,10,20,30,40]
  if (!VALID.includes(trlLevel))
    return NextResponse.json({ error: "trlLevel invalide" }, { status: 400 })
  if (!text?.trim())
    return NextResponse.json({ error: "text requis" }, { status: 400 })

  // sortOrder = dernier + 1
  const last = await prisma.tRLChecklistItem.findFirst({
    where: { projectId: id, trlLevel },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })

  const item = await prisma.tRLChecklistItem.create({
    data: {
      projectId: id,
      trlLevel,
      text: text.trim(),
      checked: false,
      isCustom: true,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  })

  return NextResponse.json(item, { status: 201 })
}

// PATCH — toggle checked OU modifier le texte d'un item custom
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const { itemId, checked, text } = await req.json()
  if (!itemId) return NextResponse.json({ error: "itemId requis" }, { status: 400 })

  // Vérifier que l'item appartient bien à ce projet (et à cette org)
  const item = await prisma.tRLChecklistItem.findFirst({
    where: { id: itemId, project: { id, organizationId: session.user.organizationId } },
  })
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  // Un item officiel peut seulement être coché/décoché
  const data: Record<string, any> = {}
  if (checked !== undefined) data.checked = Boolean(checked)
  if (text !== undefined && item.isCustom) data.text = text.trim()

  const updated = await prisma.tRLChecklistItem.update({
    where: { id: itemId },
    data,
  })
  return NextResponse.json(updated)
}

// DELETE — supprimer un item personnalisé uniquement
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const { itemId } = await req.json()
  if (!itemId) return NextResponse.json({ error: "itemId requis" }, { status: 400 })

  const item = await prisma.tRLChecklistItem.findFirst({
    where: { id: itemId, project: { id, organizationId: session.user.organizationId } },
  })
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  if (!item.isCustom)
    return NextResponse.json({ error: "Les items officiels GC ne peuvent pas être supprimés" }, { status: 403 })

  await prisma.tRLChecklistItem.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}
