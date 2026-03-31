import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PrintClient } from "./print-client"

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth()
  const { id } = await params

  const report = await prisma.report.findFirst({
    where: { id },
    include: { project: { select: { id: true, name: true, code: true } } },
  })
  if (!report) notFound()

  return <PrintClient report={report as any} />
}
