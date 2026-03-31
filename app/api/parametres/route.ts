import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { testSmtpConnection, getOrgSmtpConfig } from "@/lib/email"

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId: session.user.organizationId },
  })

  // Ne jamais exposer le mot de passe SMTP en clair
  return NextResponse.json({
    smtpHost:       settings?.smtpHost ?? "",
    smtpPort:       settings?.smtpPort ?? 587,
    smtpSecure:     settings?.smtpSecure ?? false,
    smtpUser:       settings?.smtpUser ?? "",
    smtpPassSet:    !!settings?.smtpPass,  // boolean only — never send the password back
    smtpFrom:       settings?.smtpFrom ?? "",
    notifyBudget90: settings?.notifyBudget90 ?? true,
    notifyBudget100: settings?.notifyBudget100 ?? true,
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 })
  }

  const body = await req.json()
  const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom,
          notifyBudget90, notifyBudget100 } = body

  const data: Record<string, unknown> = {
    smtpHost:        smtpHost  || null,
    smtpPort:        parseInt(smtpPort) || 587,
    smtpSecure:      !!smtpSecure,
    smtpUser:        smtpUser  || null,
    smtpFrom:        smtpFrom  || null,
    notifyBudget90:  notifyBudget90  !== undefined ? !!notifyBudget90  : true,
    notifyBudget100: notifyBudget100 !== undefined ? !!notifyBudget100 : true,
  }
  // Only update password if a new one was provided
  if (smtpPass?.trim()) data.smtpPass = smtpPass.trim()

  const settings = await prisma.organizationSettings.upsert({
    where:  { organizationId: session.user.organizationId },
    create: { organizationId: session.user.organizationId, ...data },
    update: data,
  })

  return NextResponse.json({ success: true, settingsId: settings.id })
}

// POST /api/parametres/test — test SMTP connection
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 })
  }

  const config = await getOrgSmtpConfig(session.user.organizationId)
  if (!config) {
    return NextResponse.json({ ok: false, error: "Aucune configuration SMTP enregistrée." })
  }

  const result = await testSmtpConnection(config)
  return NextResponse.json(result)
}
