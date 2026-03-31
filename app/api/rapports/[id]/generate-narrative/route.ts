import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const { id } = await params

  const report = await prisma.report.findFirst({
    where: { id, project: { organizationId: session.user.organizationId } },
    include: {
      project: {
        include: {
          charter: true,
          hypotheses: { orderBy: { version: "asc" } },
          testExperiences: true,
          journalEntries: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      },
    },
  })
  if (!report) return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 })

  const t661 = report.t661Data as any
  const project = report.project
  const charter = project.charter

  // Contexte pour Claude
  const context = `
Projet: ${project.name} (${project.code})
Description: ${project.description ?? "N/A"}

CHARTE RS&DE:
- Objectif: ${charter?.objective ?? "N/A"}
- Incertitudes technologiques: ${charter?.technicalUncertainties ?? "N/A"}
- Hypothèses initiales: ${charter?.hypotheses ?? "N/A"}
- Critères d'acceptation: ${charter?.acceptanceCriteria ?? "N/A"}
- Livrables: ${charter?.expectedDeliverables ?? "N/A"}

HYPOTHÈSES (avec évolution):
${project.hypotheses.map(h => `v${h.version}: ${h.title} — ${h.description} [${h.status}]${h.pivotReason ? ` PIVOT: ${h.pivotReason}` : ""}`).join("\n")}

EXPÉRIENCES ET TESTS:
${project.testExperiences.map(t => `- ${t.title}: ${t.objective}. Résultat: ${t.resultType ?? "en cours"}. Conclusion: ${t.conclusion ?? "N/A"}`).join("\n")}

STATISTIQUES:
- Heures R&D directes: ${t661.hours.rdDirect}h
- Heures support R&D: ${t661.hours.rdSupport}h
- Coûts de main-d'œuvre éligibles: ${t661.costs.salaries}$
`

  async function generateLine(line: string, instructions: string): Promise<string> {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Tu es un expert en rédaction de demandes RS&DE canadiennes (T661).
Génère le narratif pour ${line} du formulaire T661 basé sur ce contexte de projet R&D:

${context}

Instructions spécifiques pour ${line}:
${instructions}

Rédige en français, style professionnel et technique. Entre 400 et 700 mots.
Utilise un langage précis, factuel et conforme aux attentes de l'ARC.
Ne mets pas de titre, commence directement le narratif.`,
      }],
    })
    return (message.content[0] as { type: string; text: string }).text
  }

  const [line242, line244, line246] = await Promise.all([
    generateLine("la ligne 242", `Ligne 242 — Avancement technologique: Décris l'avancement technologique ou scientifique que ce projet cherche à réaliser. Explique pourquoi cet avancement va au-delà des connaissances disponibles publiquement. Mentionne les hypothèses testées et les pivots s'il y en a eu.`),
    generateLine("la ligne 244", `Ligne 244 — Incertitudes technologiques: Décris les incertitudes technologiques qui ont nécessité des travaux d'expérimentation systématique. Explique pourquoi les méthodes existantes ne pouvaient pas résoudre ces incertitudes et ce qui les rendait imprévisibles.`),
    generateLine("la ligne 246", `Ligne 246 — Travaux effectués: Décris les travaux de R&D effectués pour résoudre les incertitudes technologiques. Inclus les expériences menées, les tests réalisés, les méthodes appliquées et comment ils ont contribué à résoudre les incertitudes identifiées.`),
  ])

  // Mettre à jour le rapport avec les narratifs
  const updated = await prisma.report.update({
    where: { id },
    data: {
      t661Data: {
        ...(report.t661Data as object),
        narratives: { line242, line244, line246 },
      },
    },
  })

  return NextResponse.json({
    narratives: { line242, line244, line246 },
    report: updated,
  })
}
