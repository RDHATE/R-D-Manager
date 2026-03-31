import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TRL_LEVELS } from "@/lib/trl-data"

type Ctx = { params: Promise<{ id: string }> }

/**
 * Seed les items officiels GC pour un niveau donné si aucun item n'existe encore
 * pour ce projet + niveau.
 */
async function seedLevelIfEmpty(projectId: string, level: number) {
  const existing = await prisma.tRLChecklistItem.count({
    where: { projectId, trlLevel: level },
  })
  if (existing > 0) return

  const levelData = TRL_LEVELS[level - 1]
  if (!levelData) return

  await prisma.tRLChecklistItem.createMany({
    data: levelData.defaultChecklist.map((text, i) => ({
      projectId,
      trlLevel: level,
      text,
      checked: false,
      isCustom: false,
      sortOrder: i,
    })),
  })
}

// GET — TRL actuel + historique + checklist (avec seed automatique)
export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: { trlLevel: true },
  })
  if (!project) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

  // Seed tous les niveaux 1-9 si vierges (première ouverture)
  try {
    for (let lvl = 1; lvl <= 9; lvl++) {
      await seedLevelIfEmpty(id, lvl)
    }
  } catch (seedErr) {
    console.error("[GET /trl] seed error:", seedErr)
    return NextResponse.json({ error: `Erreur seed: ${String(seedErr)}` }, { status: 500 })
  }

  try {
    const [trlHistory, checklistItems] = await Promise.all([
      prisma.tRLHistory.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.tRLChecklistItem.findMany({
        where: { projectId: id },
        orderBy: [{ trlLevel: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      }),
    ])

    return NextResponse.json({
      trlLevel: project.trlLevel,
      trlHistory,
      checklistItems,
    })
  } catch (fetchErr) {
    console.error("[GET /trl] fetch error:", fetchErr)
    return NextResponse.json({ error: `Erreur chargement: ${String(fetchErr)}` }, { status: 500 })
  }
}

// PATCH — mettre à jour le niveau TRL
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  try {
    const { toLevel, note } = await req.json()
    if (!toLevel || toLevel < 1 || toLevel > 9)
      return NextResponse.json({ error: "Niveau TRL invalide (1-9)" }, { status: 400 })

    const current = await prisma.project.findFirst({
      where: { id, organizationId: session.user.organizationId },
      select: { trlLevel: true },
    })
    if (!current) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

    await prisma.$transaction([
      prisma.project.update({
        where: { id },
        data: { trlLevel: toLevel },
      }),
      prisma.tRLHistory.create({
        data: {
          projectId: id,
          fromLevel: current.trlLevel,
          toLevel,
          note: note || null,
          createdById: session.user.id,
        },
      }),
    ])

    return NextResponse.json({ trlLevel: toLevel })
  } catch (err) {
    console.error("[PATCH /trl]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
