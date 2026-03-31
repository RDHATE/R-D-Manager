import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendOrgEmail, emailApprovalRequest } from "@/lib/email"
import { notifyMany } from "@/lib/notify"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")

  const expenses = await prisma.expense.findMany({
    where: {
      project: { organizationId: session.user.organizationId },
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: { select: { id: true, name: true, code: true } },
      approval: {
        include: {
          requestedBy: { select: { id: true, name: true } },
          approver:    { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { date: "desc" },
  })

  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { projectId, description, amount, date, category, supplier, invoiceRef,
          srdeEligibility, srdePercentage, notes, approvalReason } = await req.json()

  if (!projectId || !description || !amount || !date || !category) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 })
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.user.organizationId },
    include: {
      budgetLines: true,
      members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
    },
  })
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })

  const amountNum = parseFloat(amount)

  // Calculer budget et dépenses actuelles
  const totalBudget  = project.budgetLines.reduce((s, b) => s + b.planned, 0)
  const currentSpent = await prisma.expense.aggregate({
    where: { projectId, status: { in: ["APPROVED", "PENDING"] } },
    _sum: { amount: true },
  })
  const spentSoFar = currentSpent._sum.amount ?? 0
  const willExceed = totalBudget > 0 && (spentSoFar + amountNum) > totalBudget

  // Si dépassement et pas de justification → demander justification
  if (willExceed && !approvalReason?.trim()) {
    return NextResponse.json({
      requiresApproval: true,
      currentSpent: spentSoFar,
      totalBudget,
      pct: Math.round(((spentSoFar + amountNum) / totalBudget) * 100),
    }, { status: 202 })
  }

  // Créer la dépense
  const expense = await prisma.expense.create({
    data: {
      description, amount: amountNum, date: new Date(date),
      category, supplier: supplier || null, invoiceRef: invoiceRef || null,
      srdeEligibility: srdeEligibility || "ELIGIBLE",
      srdePercentage: srdeEligibility === "PARTIAL" ? parseFloat(srdePercentage) : null,
      notes: notes || null,
      status: willExceed ? "PENDING" : "APPROVED",
      projectId,
    },
    include: {
      project: { select: { id: true, name: true, code: true } },
      approval: true,
    },
  })

  // Si dépassement → créer workflow d'approbation
  if (willExceed && approvalReason?.trim()) {
    await prisma.expenseApproval.create({
      data: {
        expenseId:     expense.id,
        requestedById: session.user.id,
        reason:        approvalReason.trim(),
        budgetBefore:  spentSoFar,
        budgetTotal:   totalBudget,
      },
    })

    // Notifier par email : chef de projet + admins
    const approvers = project.members
      .filter(m => m.user.role === "ADMIN" || m.user.role === "PROJECT_MANAGER")
      .map(m => m.user.email)
    // Aussi notifier tous les admins de l'org
    const orgAdmins = await prisma.user.findMany({
      where: { organizationId: session.user.organizationId, role: "ADMIN" },
      select: { email: true },
    })
    orgAdmins.forEach(a => { if (!approvers.includes(a.email)) approvers.push(a.email) })

    if (approvers.length > 0) {
      const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
      await sendOrgEmail(
        session.user.organizationId,
        approvers,
        `⚠️ Approbation requise — Dépense dépassant le budget [${project.code}]`,
        emailApprovalRequest({
          projectName:  project.name,
          projectCode:  project.code,
          requesterName: session.user.name ?? "Un membre",
          description,
          amount: amountNum,
          budgetSpent:  spentSoFar,
          budgetTotal:  totalBudget,
          reason:       approvalReason,
          approvalUrl:  `${appUrl}/depenses?tab=approbations`,
        })
      )
    }
  }

  // Alertes budget in-app
  if (totalBudget > 0) {
    const newSpent  = spentSoFar + amountNum
    const newPct    = (newSpent / totalBudget) * 100
    const oldPct    = (spentSoFar / totalBudget) * 100
    const memberIds = project.members.map(m => m.user.id).filter(uid => uid !== session.user.id)

    if (newPct >= 100 && oldPct < 100 && memberIds.length > 0) {
      await notifyMany(memberIds, {
        type:  "BUDGET_ALERT_100",
        title: `Budget dépassé — ${project.name}`,
        body:  `Les dépenses atteignent ${Math.round(newPct)}% du budget alloué`,
        link:  `/depenses`,
      })
    } else if (newPct >= 90 && oldPct < 90 && memberIds.length > 0) {
      await notifyMany(memberIds, {
        type:  "BUDGET_ALERT_90",
        title: `Alerte budget 90% — ${project.name}`,
        body:  `Les dépenses atteignent ${Math.round(newPct)}% du budget alloué`,
        link:  `/depenses`,
      })
    }

    // Notifier les approvers si dépense en attente
    if (willExceed) {
      const approverIds = project.members
        .filter(m => m.user.role === "ADMIN" || m.user.role === "PROJECT_MANAGER")
        .map(m => m.user.id)
        .filter(uid => uid !== session.user.id)
      if (approverIds.length > 0) {
        await notifyMany(approverIds, {
          type:  "EXPENSE_PENDING",
          title: `Approbation requise — ${project.name}`,
          body:  `Dépense "${description}" (${amountNum.toFixed(0)} $) dépasse le budget`,
          link:  `/depenses`,
        })
      }
    }
  }

  return NextResponse.json({ expense, requiresApproval: false, willExceed })
}
