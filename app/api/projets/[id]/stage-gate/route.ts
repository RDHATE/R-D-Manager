import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

// Livrables par défaut pour chaque gate (auto-générés au GO)
const DEFAULT_DELIVERABLES: Record<number, string[]> = {
  0: ["Idée documentée (fiche concept)", "Analyse d'alignement stratégique", "Estimation des ressources initiales"],
  1: ["Étude de faisabilité préliminaire", "Revue de littérature scientifique", "Identification des incertitudes technologiques", "Budget préliminaire estimé"],
  2: ["Cas d'affaires complet", "Plan de projet RS&DE détaillé", "Analyse des risques techniques", "Charte de projet approuvée", "Hypothèses de travail documentées"],
  3: ["Protocoles expérimentaux rédigés", "Résultats d'expériences documentés", "Journal de bord RS&DE à jour", "Prototype fonctionnel", "Rapport intermédiaire"],
  4: ["Rapport de tests de validation", "Critères d'acceptation RS&DE vérifiés", "Validation en environnement pertinent", "Dossier de qualification", "Données RS&DE complètes pour T661"],
  5: ["Produit/process lancé en production", "Dossier RS&DE archivé", "Réclamation T661 préparée", "Rapport final de projet", "Leçons apprises documentées"],
}

// GET — état Stage-Gate + livrables
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: {
      currentGate: true,
      gateDecisions:    { orderBy: { createdAt: "desc" } },
      gateDeliverables: { orderBy: [{ gate: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  })
  if (!project) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  return NextResponse.json(project)
}

// POST — enregistrer une décision de gate
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  try {
    const { gate, decision, criteria, notes } = await req.json()

    if (gate === undefined || gate < 0 || gate > 5)
      return NextResponse.json({ error: "Gate invalide (0-5)" }, { status: 400 })

    const current = await prisma.project.findUnique({
      where: { id },
      select: { currentGate: true },
    })

    const isGoDecision = decision === "GO"
    const nextGate = gate + 1
    const shouldAdvance = isGoDecision && gate >= (current?.currentGate ?? 0)
    const shouldGenerateNext = isGoDecision && nextGate <= 5

    // Vérifier si les livrables de la prochaine gate existent déjà
    let existingNextDeliverables = 0
    if (shouldGenerateNext) {
      existingNextDeliverables = await prisma.gateDeliverable.count({
        where: { projectId: id, gate: nextGate },
      })
    }

    const ops: any[] = [
      prisma.stageGateDecision.create({
        data: {
          projectId: id,
          gate,
          decision,
          criteria: criteria ?? null,
          notes: notes || null,
          createdById: session.user.id,
        },
      }),
    ]

    if (shouldAdvance) {
      ops.push(
        prisma.project.update({ where: { id }, data: { currentGate: nextGate <= 5 ? nextGate : gate } })
      )
    }

    // Auto-générer les livrables de la prochaine gate si pas encore créés
    if (shouldGenerateNext && existingNextDeliverables === 0) {
      const labels = DEFAULT_DELIVERABLES[nextGate] ?? []
      labels.forEach((label, idx) => {
        ops.push(
          prisma.gateDeliverable.create({
            data: { projectId: id, gate: nextGate, label, sortOrder: idx },
          })
        )
      })
    }

    const results = await prisma.$transaction(ops)
    const gateDecision = results[0]

    // Récupérer les livrables générés
    const newDeliverables = shouldGenerateNext && existingNextDeliverables === 0
      ? await prisma.gateDeliverable.findMany({
          where: { projectId: id, gate: nextGate },
          orderBy: { sortOrder: "asc" },
        })
      : []

    return NextResponse.json({ gateDecision, newDeliverables, nextGate: shouldAdvance ? nextGate : null }, { status: 201 })
  } catch (err) {
    console.error("[POST /stage-gate]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
