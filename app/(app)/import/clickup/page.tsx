import { requireAuth } from "@/lib/session"
import { ClickUpWizard } from "./clickup-wizard"

export default async function ClickUpImportPage() {
  await requireAuth()
  return <ClickUpWizard />
}
