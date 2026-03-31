import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const reports = await prisma.report.findMany({
    where: { project: { organizationId: session.user.organizationId } },
    include: { project: { select: { id: true, name: true, code: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { projectId, fiscalYear } = await req.json()
  if (!projectId || !fiscalYear) {
    return NextResponse.json({ error: "Projet et année fiscale requis." }, { status: 400 })
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.user.organizationId },
    include: {
      charter: true,
      hypotheses: { where: { status: { in: ["ACTIVE", "ABANDONED"] } }, orderBy: { version: "asc" } },
      testExperiences: { orderBy: { createdAt: "desc" } },
      timeEntries: {
        include: { user: { select: { id: true, name: true } } },
      },
      expenses: true,
      members: { include: { user: { select: { id: true, name: true, hourlyRate: true } } } },
    },
  })
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

  // === Calculs heures RS&DE ===
  const allEntries = project.timeEntries
  const rdEntries    = allEntries.filter(e => e.category === "RD_DIRECT")
  const suppEntries  = allEntries.filter(e => e.category === "RD_SUPPORT")

  const totalHours   = allEntries.reduce((s, e) => s + e.hours, 0)
  const rdHours      = rdEntries.reduce((s, e) => s + e.hours, 0)
  const suppHours    = suppEntries.reduce((s, e) => s + e.hours, 0)
  const eligibleHours = rdHours + suppHours * 0.8 // Support à 80%

  // Par employé
  const byEmployee: Record<string, { name: string; rdHours: number; suppHours: number; nonHours: number; totalHours: number }> = {}
  allEntries.forEach(e => {
    if (!byEmployee[e.userId]) {
      byEmployee[e.userId] = { name: e.user.name, rdHours: 0, suppHours: 0, nonHours: 0, totalHours: 0 }
    }
    byEmployee[e.userId].totalHours += e.hours
    if (e.category === "RD_DIRECT")   byEmployee[e.userId].rdHours   += e.hours
    if (e.category === "RD_SUPPORT")  byEmployee[e.userId].suppHours  += e.hours
    if (e.category === "NON_ELIGIBLE")byEmployee[e.userId].nonHours   += e.hours
  })

  // Calcul salaires RS&DE
  let salaryCost = 0
  Object.entries(byEmployee).forEach(([userId, data]) => {
    const member = project.members.find(m => m.userId === userId)
    const rate   = member?.user.hourlyRate ?? 50
    salaryCost  += (data.rdHours + data.suppHours * 0.8) * rate
  })

  // Dépenses RS&DE
  const eligibleExpenses = project.expenses
    .filter(e => e.srdeEligibility !== "NOT_ELIGIBLE")
    .reduce((s, e) => {
      const pct = e.srdeEligibility === "PARTIAL" ? (e.srdePercentage ?? 50) / 100 : 1
      return s + e.amount * pct
    }, 0)

  // === Calcul crédits estimés ===
  const totalEligible = salaryCost + eligibleExpenses
  // Fédéral T661: 15% sur dépenses éligibles (approximation de base)
  const federalCredit = totalEligible * 0.15
  // CRIC Québec: 14% supplémentaire sur salaires éligibles (approximation)
  const cricCredit    = salaryCost * 0.14

  const t661Data = {
    fiscalYear,
    projectInfo: {
      name: project.name,
      code: project.code,
      description: project.description,
    },
    hours: {
      total: parseFloat(totalHours.toFixed(2)),
      rdDirect: parseFloat(rdHours.toFixed(2)),
      rdSupport: parseFloat(suppHours.toFixed(2)),
      eligible: parseFloat(eligibleHours.toFixed(2)),
      byEmployee: Object.values(byEmployee).map(e => ({
        ...e,
        rdHours: parseFloat(e.rdHours.toFixed(2)),
        suppHours: parseFloat(e.suppHours.toFixed(2)),
        nonHours: parseFloat(e.nonHours.toFixed(2)),
        totalHours: parseFloat(e.totalHours.toFixed(2)),
      })),
    },
    costs: {
      salaries: parseFloat(salaryCost.toFixed(2)),
      expenses: parseFloat(eligibleExpenses.toFixed(2)),
      total: parseFloat(totalEligible.toFixed(2)),
    },
    credits: {
      federal: parseFloat(federalCredit.toFixed(2)),
      cric: parseFloat(cricCredit.toFixed(2)),
      total: parseFloat((federalCredit + cricCredit).toFixed(2)),
    },
    hypotheses: project.hypotheses.map(h => ({
      version: h.version,
      title: h.title,
      description: h.description,
      status: h.status,
      pivotReason: h.pivotReason,
    })),
    testExperiences: project.testExperiences.map(t => ({
      title: t.title,
      objective: t.objective,
      results: t.results,
      conclusion: t.conclusion,
      resultType: t.resultType,
    })),
    narratives: {
      line242: null as string | null,  // Sera généré par IA
      line244: null as string | null,
      line246: null as string | null,
    },
    generatedAt: new Date().toISOString(),
  }

  const cricData = {
    fiscalYear,
    eligibleSalaries: parseFloat(salaryCost.toFixed(2)),
    cricCredit: parseFloat(cricCredit.toFixed(2)),
    province: "QC",
  }

  const report = await prisma.report.create({
    data: {
      fiscalYear: parseInt(fiscalYear),
      title: `Rapport RS&DE ${fiscalYear} — ${project.name}`,
      t661Data,
      cricData,
      projectId,
    },
    include: { project: { select: { id: true, name: true, code: true } } },
  })

  return NextResponse.json(report)
}
