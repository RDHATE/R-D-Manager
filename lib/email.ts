import nodemailer from "nodemailer"
import { prisma } from "./prisma"

type SmtpConfig = {
  host: string; port: number; secure: boolean
  user: string; pass: string; from: string
}

// Config SMTP depuis les paramètres de l'organisation
export async function getOrgSmtpConfig(organizationId: string): Promise<SmtpConfig | null> {
  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId },
  })
  if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPass) return null
  return {
    host:   settings.smtpHost,
    port:   settings.smtpPort,
    secure: settings.smtpSecure,
    user:   settings.smtpUser,
    pass:   settings.smtpPass,
    from:   settings.smtpFrom ?? `"InnoProject" <${settings.smtpUser}>`,
  }
}

export async function sendOrgEmail(
  organizationId: string,
  to: string | string[],
  subject: string,
  html: string
) {
  const config = await getOrgSmtpConfig(organizationId)

  // Fallback sur config globale .env si pas de config org
  const host = config?.host ?? process.env.SMTP_HOST
  const user = config?.user ?? process.env.SMTP_USER
  const pass = config?.pass ?? process.env.SMTP_PASS
  const from = config?.from ?? `"InnoProject" <${process.env.SMTP_USER}>`
  const port = config?.port ?? parseInt(process.env.SMTP_PORT ?? "587")
  const secure = config?.secure ?? process.env.SMTP_SECURE === "true"

  if (!host || !user || !pass) {
    console.log(`[EMAIL - no SMTP config for org ${organizationId}]\nTo: ${Array.isArray(to) ? to.join(", ") : to}\nSubject: ${subject}`)
    return { sent: false, reason: "no_smtp_config" }
  }

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } })

  try {
    await transporter.sendMail({
      from,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
    })
    return { sent: true }
  } catch (err) {
    console.error("[EMAIL ERROR]", err)
    return { sent: false, reason: "smtp_error" }
  }
}

// Test de connexion SMTP
export async function testSmtpConnection(config: SmtpConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host, port: config.port, secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    })
    await transporter.verify()
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Connexion échouée" }
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function emailApprovalRequest(data: {
  projectName: string; projectCode: string; requesterName: string
  description: string; amount: number; budgetSpent: number; budgetTotal: number
  reason: string; approvalUrl: string
}) {
  const pct = data.budgetTotal > 0 ? Math.round(((data.budgetSpent + data.amount) / data.budgetTotal) * 100) : 0
  const fmt = (n: number) => n.toLocaleString("fr-CA", { minimumFractionDigits: 2 }) + " $"

  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <div style="background:#1e40af;padding:24px 32px;">
    <p style="color:#93c5fd;margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;">InnoProject · Alerte budget</p>
    <h1 style="color:white;margin:0;font-size:20px;">Approbation requise</h1>
  </div>
  <div style="background:#fef9c3;border-left:4px solid #f59e0b;padding:12px 32px;font-size:14px;color:#92400e;">
    ⚠️ Une dépense dépasse le budget prévu pour <strong>${data.projectCode} — ${data.projectName}</strong>
  </div>
  <div style="padding:32px;">
    <p style="color:#64748b;margin:0 0 20px;font-size:14px;"><strong>${data.requesterName}</strong> a soumis une dépense qui nécessite votre approbation.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;">Dépense soumise</p>
      <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#0f172a;">${data.description}</p>
      <p style="margin:0;font-size:22px;font-weight:900;color:#dc2626;">${fmt(data.amount)}</p>
    </div>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;">Situation budgétaire</p>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:13px;color:#64748b;">Dépenses actuelles :</span><span style="font-size:13px;font-weight:600;">${fmt(data.budgetSpent)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:#64748b;">Budget total prévu :</span><span style="font-size:13px;font-weight:600;">${fmt(data.budgetTotal)}</span>
      </div>
      <div style="height:8px;background:#fee2e2;border-radius:4px;overflow:hidden;">
        <div style="height:100%;background:#dc2626;border-radius:4px;width:${Math.min(pct, 100)}%;"></div>
      </div>
      <p style="margin:6px 0 0;font-size:12px;color:#dc2626;font-weight:700;">${pct}% du budget après cette dépense</p>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;color:#16a34a;text-transform:uppercase;font-weight:600;">Justification</p>
      <p style="margin:0;font-size:14px;color:#0f172a;font-style:italic;">"${data.reason}"</p>
    </div>
    <div style="text-align:center;">
      <a href="${data.approvalUrl}" style="display:inline-block;background:#1e40af;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">
        Approuver ou rejeter dans InnoProject →
      </a>
    </div>
  </div>
  <div style="background:#f8fafc;padding:14px 32px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">InnoProject · Notification automatique · RS&DE Canada</p>
  </div>
</div>
</body></html>`
}

export function emailApprovalDecision(data: {
  requesterName: string; projectName: string; description: string
  amount: number; approved: boolean; approverName: string; comment?: string
}) {
  const fmt = (n: number) => n.toLocaleString("fr-CA", { minimumFractionDigits: 2 }) + " $"
  const color = data.approved ? "#059669" : "#dc2626"
  const label = data.approved ? "✅ Approuvée" : "❌ Rejetée"

  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <div style="background:${color};padding:24px 32px;">
    <h1 style="color:white;margin:0;font-size:20px;">${label}</h1>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">Décision de ${data.approverName}</p>
  </div>
  <div style="padding:32px;">
    <p style="color:#64748b;font-size:14px;margin:0 0 16px;">Bonjour ${data.requesterName},</p>
    <p style="color:#0f172a;font-size:14px;margin:0 0 16px;">
      Votre dépense <strong>"${data.description}"</strong> de <strong>${fmt(data.amount)}</strong>
      sur le projet <strong>${data.projectName}</strong> a été
      <strong style="color:${color};">${data.approved ? "approuvée" : "rejetée"}</strong>.
    </p>
    ${data.comment ? `<div style="background:#f8fafc;border-left:4px solid ${color};padding:12px 16px;border-radius:4px;margin-bottom:16px;"><p style="margin:0;font-size:13px;color:#0f172a;font-style:italic;">"${data.comment}"</p></div>` : ""}
    ${!data.approved ? `<p style="color:#64748b;font-size:13px;">La dépense a été annulée. Vous pouvez soumettre une nouvelle demande avec des ajustements.</p>` : ""}
  </div>
  <div style="background:#f8fafc;padding:14px 32px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">InnoProject · Notification automatique</p>
  </div>
</div>
</body></html>`
}

export function emailBudgetAlert(data: {
  projectName: string; projectCode: string; pct: number
  spent: number; budget: number; appUrl: string
}) {
  const fmt = (n: number) => n.toLocaleString("fr-CA", { minimumFractionDigits: 0 }) + " $"
  const isOver = data.pct >= 100
  const color = isOver ? "#dc2626" : "#d97706"

  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <div style="background:${color};padding:24px 32px;">
    <h1 style="color:white;margin:0;font-size:20px;">${isOver ? "⚠️ Budget dépassé" : "⚠️ 90% du budget atteint"}</h1>
    <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;">${data.projectCode} — ${data.projectName}</p>
  </div>
  <div style="padding:32px;">
    <p style="font-size:14px;color:#0f172a;margin:0 0 20px;">
      Le projet <strong>${data.projectName}</strong> a consommé <strong style="color:${color};">${data.pct}%</strong> de son budget.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="color:#64748b;font-size:13px;">Dépenses totales :</span><span style="font-weight:700;">${fmt(data.spent)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <span style="color:#64748b;font-size:13px;">Budget prévu :</span><span style="font-weight:700;">${fmt(data.budget)}</span>
      </div>
      <div style="height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden;">
        <div style="height:100%;background:${color};width:${Math.min(data.pct, 100)}%;"></div>
      </div>
    </div>
    <a href="${data.appUrl}/depenses" style="display:inline-block;background:#1e40af;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">Voir les dépenses →</a>
  </div>
  <div style="background:#f8fafc;padding:14px 32px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">InnoProject · Notification automatique</p>
  </div>
</div>
</body></html>`
}
