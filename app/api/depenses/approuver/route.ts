import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendOrgEmail, emailApprovalDecision } from "@/lib/email"
import { notify } from "@/lib/notify"

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  if (session.user.role !== "ADMIN" && session.user.role !== "PROJECT_MANAGER") {
    return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 })
  }

  const { expenseId, decision, comment } = await req.json()
  // decision: "APPROVED" | "REJECTED"

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, project: { organizationId: session.user.organizationId } },
    include: {
      project: true,
      approval: { include: { requestedBy: { select: { id: true, name: true, email: true } } } },
    },
  })
  if (!expense) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
  if (expense.status !== "PENDING") return NextResponse.json({ error: "Déjà traitée." }, { status: 400 })

  // Mettre à jour la dépense et l'approbation
  const [updatedExpense] = await prisma.$transaction([
    prisma.expense.update({
      where: { id: expenseId },
      data: { status: decision },
    }),
    prisma.expenseApproval.update({
      where: { expenseId },
      data: { approverId: session.user.id, comment: comment || null },
    }),
  ])

  // Notifier le demandeur in-app
  if (expense.approval?.requestedBy.id && expense.approval.requestedBy.id !== session.user.id) {
    await notify({
      userId: expense.approval.requestedBy.id,
      type:   decision === "APPROVED" ? "EXPENSE_APPROVED" : "EXPENSE_REJECTED",
      title:  decision === "APPROVED"
        ? `Dépense approuvée — ${expense.description}`
        : `Dépense rejetée — ${expense.description}`,
      body:   `${session.user.name} a ${decision === "APPROVED" ? "approuvé" : "rejeté"} votre dépense de ${expense.amount.toFixed(0)} $`,
      link:   `/depenses`,
    })
  }

  // Notifier le demandeur par email
  if (expense.approval?.requestedBy.email) {
    await sendOrgEmail(
      session.user.organizationId,
      expense.approval.requestedBy.email,
      `${decision === "APPROVED" ? "✅ Approuvée" : "❌ Rejetée"} — Dépense "${expense.description}"`,
      emailApprovalDecision({
        requesterName: expense.approval.requestedBy.name,
        projectName:   expense.project.name,
        description:   expense.description,
        amount:        expense.amount,
        approved:      decision === "APPROVED",
        approverName:  session.user.name ?? "Un approbateur",
        comment,
      })
    )
  }

  return NextResponse.json({ success: true, status: decision })
}

// GET — liste des approbations en attente
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const pending = await prisma.expense.findMany({
    where: {
      project: { organizationId: session.user.organizationId },
      status: "PENDING",
    },
    include: {
      project: { select: { id: true, name: true, code: true } },
      approval: {
        include: {
          requestedBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(pending)
}
