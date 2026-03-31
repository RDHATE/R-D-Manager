import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ParametresClient } from "./parametres-client"

export default async function ParametresPage() {
  const session = await requireAuth()

  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId: session.user.organizationId },
  })

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true },
  })

  return (
    <ParametresClient
      orgName={org?.name ?? ""}
      currentUserRole={session.user.role}
      initialSettings={{
        smtpHost:        settings?.smtpHost        ?? "",
        smtpPort:        settings?.smtpPort        ?? 587,
        smtpSecure:      settings?.smtpSecure      ?? false,
        smtpUser:        settings?.smtpUser        ?? "",
        smtpPassSet:     !!settings?.smtpPass,
        smtpFrom:        settings?.smtpFrom        ?? "",
        notifyBudget90:  settings?.notifyBudget90  ?? true,
        notifyBudget100: settings?.notifyBudget100 ?? true,
      }}
    />
  )
}
