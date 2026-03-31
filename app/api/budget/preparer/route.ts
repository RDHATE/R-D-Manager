import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { projectId, targetYear } = await req.json()
  if (!projectId || !targetYear) {
    return NextResponse.json({ error: "projectId et targetYear requis" }, { status: 400 })
  }

  // Vérifier accès au projet
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.user.organizationId },
    select: { id: true, name: true, code: true, description: true },
  })
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

  // Récupérer les dépenses des 2 dernières années
  const pastExpenses = await prisma.expense.findMany({
    where: {
      projectId,
      status: { in: ["APPROVED"] },
      date: {
        gte: new Date(`${targetYear - 2}-01-01`),
        lt: new Date(`${targetYear}-01-01`),
      },
    },
    select: {
      amount: true,
      category: true,
      srdeEligibility: true,
      srdePercentage: true,
      date: true,
      description: true,
    },
    orderBy: { date: "asc" },
  })

  // Récupérer les budgets précédents
  const pastBudgets = await prisma.budgetLine.findMany({
    where: { projectId, fiscalYear: { lt: targetYear } },
    select: { category: true, planned: true, fiscalYear: true },
    orderBy: { fiscalYear: "asc" },
  })

  // Agréger par catégorie et année pour le résumé
  const byYearCat: Record<number, Record<string, { spent: number; count: number }>> = {}
  for (const e of pastExpenses) {
    const year = new Date(e.date).getFullYear()
    if (!byYearCat[year]) byYearCat[year] = {}
    if (!byYearCat[year][e.category]) byYearCat[year][e.category] = { spent: 0, count: 0 }
    byYearCat[year][e.category].spent += e.amount
    byYearCat[year][e.category].count += 1
  }

  const CATEGORIES = {
    SALARY: "Salaires",
    MATERIALS: "Matériaux et fournitures",
    SUBCONTRACT: "Sous-traitance",
    EQUIPMENT: "Équipement",
    OVERHEAD: "Frais généraux",
    OTHER: "Autres",
  }

  const historique = Object.entries(byYearCat)
    .map(([year, cats]) =>
      `Année ${year}:\n` +
      Object.entries(cats)
        .map(([cat, d]) => `  - ${CATEGORIES[cat as keyof typeof CATEGORIES] ?? cat}: ${d.spent.toLocaleString("fr-CA")} $ (${d.count} dépenses)`)
        .join("\n")
    ).join("\n\n")

  const budgetsPrec = pastBudgets.length > 0
    ? pastBudgets
        .map(b => `  Année ${b.fiscalYear} — ${CATEGORIES[b.category as keyof typeof CATEGORIES] ?? b.category}: ${b.planned.toLocaleString("fr-CA")} $`)
        .join("\n")
    : "  Aucun budget antérieur enregistré."

  const prompt = `Tu es un expert en gestion de budget RS&DE (Recherche Scientifique et Développement Expérimental) au Canada.

Projet : ${project.code} — ${project.name}
${project.description ? `Description : ${project.description}` : ""}
Année budgétaire cible : ${targetYear}

=== HISTORIQUE DES DÉPENSES RÉELLES ===
${historique || "Aucune dépense historique disponible."}

=== BUDGETS ANTÉRIEURS ===
${budgetsPrec}

=== CATÉGORIES RS&DE ===
- SALARY (Salaires) : Salaires des employés RS&DE — généralement admissibles à 100%
- MATERIALS (Matériaux) : Matériaux consommés dans les expériences — admissibles selon usage
- SUBCONTRACT (Sous-traitance) : Contrats RS&DE — 80% admissibles avec entités canadiennes
- EQUIPMENT (Équipement) : Équipements utilisés pour RS&DE — admissibles au prorata
- OVERHEAD (Frais généraux) : Frais liés aux activités RS&DE
- OTHER (Autres) : Autres dépenses admissibles

En te basant sur l'historique, propose un budget détaillé pour l'année ${targetYear}.
Réponds UNIQUEMENT avec un JSON valide dans ce format exact (aucun texte avant ou après) :
{
  "suggestions": {
    "SALARY": { "montant": 0, "justification": "...", "variation": "+X% vs année précédente", "admissibilite": "ELIGIBLE" },
    "MATERIALS": { "montant": 0, "justification": "...", "variation": "...", "admissibilite": "ELIGIBLE" },
    "SUBCONTRACT": { "montant": 0, "justification": "...", "variation": "...", "admissibilite": "PARTIAL" },
    "EQUIPMENT": { "montant": 0, "justification": "...", "variation": "...", "admissibilite": "PARTIAL" },
    "OVERHEAD": { "montant": 0, "justification": "...", "variation": "...", "admissibilite": "PARTIAL" },
    "OTHER": { "montant": 0, "justification": "...", "variation": "...", "admissibilite": "NOT_ELIGIBLE" }
  },
  "totalSuggere": 0,
  "totalRDEligible": 0,
  "commentaireGlobal": "...",
  "alertes": ["..."]
}`

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()

  // Extract JSON from response
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: "Réponse IA invalide" }, { status: 500 })
  }

  const result = JSON.parse(jsonMatch[0])
  return NextResponse.json(result)
}
