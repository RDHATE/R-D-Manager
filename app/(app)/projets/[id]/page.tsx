import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Users, Flag } from "lucide-react"
import { SprintBoard } from "@/components/sprints/sprint-board"
import { AjouterTacheDialog } from "@/components/dialogs/ajouter-tache-dialog"
import { AjouterMembreDialog } from "@/components/dialogs/ajouter-membre-dialog"
import { ConfigStatutsDialog } from "@/components/dialogs/config-statuts-dialog"
import { TachesTableau } from "@/components/projets/taches-tableau"
import { HypothesesPanel } from "@/components/projets/hypotheses-panel"
import { ARCStatusStepper } from "@/components/projets/arc-status-stepper"
import { GanttClientWrapper } from "@/components/projets/gantt-client-wrapper"
import { JalonsMilestonesTree } from "@/components/projets/jalons-milestone-tree"
import ProjectDashboardTab from "@/components/projets/project-dashboard-tab"
import { TRLDashboard } from "@/components/projets/trl-dashboard"
import { StageGatePanel } from "@/components/projets/stage-gate-panel"
import { ProjectTabs } from "@/components/projets/project-tabs"

const DEFAULT_STATUSES = [
  { id: "TODO",        label: "À faire",     color: "slate" },
  { id: "IN_PROGRESS", label: "En cours",    color: "blue" },
  { id: "IN_REVIEW",   label: "En révision", color: "amber" },
  { id: "DONE",        label: "Terminé",     color: "green" },
  { id: "BLOCKED",     label: "Bloqué",      color: "red" },
]

const STATUS_NEON: Record<string, string> = {
  DRAFT:     "#94a3b8",
  ACTIVE:    "#22d3ee",
  COMPLETED: "#4ade80",
  ARCHIVED:  "#475569",
}
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon", ACTIVE: "Actif", COMPLETED: "Terminé", ARCHIVED: "Archivé",
}

type StatusConfig = { id: string; label: string; color: string }

export default async function ProjetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      charter: true,
      members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      tasks: {
        where: { parentId: null },
        include: {
          assignee: { select: { name: true } },
          children: {
            include: { assignee: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      milestones: { orderBy: { dueDate: "asc" } },
      hypotheses: { orderBy: [{ status: "asc" }, { version: "desc" }] },
    },
  })

  if (!project) notFound()

  const allTasks = await prisma.task.findMany({
    where: { projectId: id },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  })

  const ganttTasks = await prisma.task.findMany({
    where: { projectId: id },
    include: {
      assignee:     { select: { id: true, name: true } },
      children:     { select: { id: true, title: true, status: true, isMilestone: true } },
      predecessors: { include: { predecessor: { select: { id: true, title: true, dueDate: true } } } },
      successors:   { include: { successor: { select: { id: true, title: true, startDate: true } } } },
    },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  })

  const statuses: StatusConfig[] = (project.statusConfig as StatusConfig[] | null) ?? DEFAULT_STATUSES
  const customColumns = (project.customColumns as any[] | null) ?? []
  const members = project.members.map(m => ({ id: m.user.id, name: m.user.name }))

  const totalTasks = project.tasks.reduce((acc, t) => acc + 1 + t.children.length, 0)
  const doneTasks  = project.tasks.reduce(
    (acc, t) => acc + (t.status === "DONE" ? 1 : 0) + t.children.filter(c => c.status === "DONE").length, 0
  )
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const statusColor = STATUS_NEON[project.status] ?? "#94a3b8"

  const tabPanels = {
    dashboard: (
      <ProjectDashboardTab
        projectId={id} projectName={project.name}
        tasks={project.tasks as any} members={members}
        milestones={project.milestones as any} statuses={statuses}
      />
    ),
    tasks: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <ConfigStatutsDialog projectId={id} statuses={statuses} />
          <AjouterTacheDialog projectId={id} members={members} tasks={allTasks} statuses={statuses} />
        </div>
        <TachesTableau
          projectId={id} projectName={project.name}
          tasks={project.tasks as any} statuses={statuses}
          customColumns={customColumns} members={members}
        />
      </div>
    ),
    gantt: (
      <GanttClientWrapper tasks={ganttTasks as any} projectId={id} members={members} />
    ),
    trl: <TRLDashboard projectId={id} />,
    "stage-gate": <StageGatePanel projectId={id} />,
    sprints: <SprintBoard projectId={id} members={members} />,
    hypotheses: (
      <HypothesesPanel projectId={id} hypotheses={project.hypotheses as any} />
    ),
    milestones: (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <AjouterTacheDialog projectId={id} members={members} tasks={allTasks} statuses={statuses} triggerLabel="Ajouter un jalon" />
        </div>
        <JalonsMilestonesTree
          milestones={project.tasks.filter(t => t.isMilestone).map(t => ({
            id: t.id, title: t.title, status: t.status, dueDate: t.dueDate,
            children: t.children.map(c => ({ id: c.id, title: c.title, status: c.status })),
          }))}
        />
        {project.milestones.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#475569", fontSize: 13,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
            Aucun jalon. Les jalons marquent les étapes clés du projet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {project.milestones.map(m => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "12px 16px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: m.completed ? "rgba(74,222,128,0.12)" : "rgba(251,146,60,0.12)",
                    border: `1px solid ${m.completed ? "rgba(74,222,128,0.3)" : "rgba(251,146,60,0.3)"}`,
                    flexShrink: 0,
                  }}>
                    <Flag style={{ width: 14, height: 14, color: m.completed ? "#4ade80" : "#fb923c" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{m.title}</p>
                    {m.description && <p style={{ fontSize: 11, color: "#64748b" }}>{m.description}</p>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{new Date(m.dueDate).toLocaleDateString("fr-CA")}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                    background: m.completed ? "rgba(74,222,128,0.12)" : "rgba(251,146,60,0.12)",
                    border: `1px solid ${m.completed ? "rgba(74,222,128,0.25)" : "rgba(251,146,60,0.25)"}`,
                    color: m.completed ? "#4ade80" : "#fb923c",
                  }}>
                    {m.completed ? "Atteint" : "En attente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    charter: project.charter ? (
      <div style={{ display: "grid", gap: 12 }}>
        {[
          { label: "Objectif scientifique/technologique",  value: project.charter.objective },
          { label: "Incertitudes technologiques",          value: project.charter.technicalUncertainties },
          { label: "Hypothèses de travail",                value: project.charter.hypotheses },
          { label: "Critères d'acceptation",               value: project.charter.acceptanceCriteria },
          { label: "Livrables attendus",                   value: project.charter.expectedDeliverables },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10, padding: "14px 16px",
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              {label}
            </p>
            <p style={{ fontSize: 13, color: "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{value}</p>
          </div>
        ))}
      </div>
    ) : (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "#475569", fontSize: 13,
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
        Aucune charte RS&DE définie.
      </div>
    ),
    team: (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <AjouterMembreDialog projectId={id} />
        </div>
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden",
        }}>
          {project.members.map((m, i) => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: i < project.members.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{m.user.name}</p>
                <p style={{ fontSize: 11, color: "#64748b" }}>{m.user.email}</p>
              </div>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8",
              }}>{m.role}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  }

  const tabs = [
    { key: "dashboard",  label: "Dashboard",     count: null },
    { key: "tasks",      label: "Tâches",        count: totalTasks },
    { key: "gantt",      label: "Gantt",         count: null },
    { key: "trl",        label: "TRL",           count: null },
    { key: "stage-gate", label: "Stage-Gate",    count: null },
    { key: "sprints",    label: "Sprints R&D",   count: null },
    { key: "hypotheses", label: "Hypothèses",    count: project.hypotheses.length },
    { key: "milestones", label: "Jalons",        count: project.milestones.length + project.tasks.filter(t => t.isMilestone).length },
    { key: "charter",    label: "Charte RS&DE",  count: null },
    { key: "team",       label: "Équipe",        count: project.members.length },
  ]

  return (
    <div style={{ padding: "32px", minHeight: "100vh", background: "var(--page-bg)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 28 }}>
        <Link href="/projets">
          <button style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            cursor: "pointer", flexShrink: 0, marginTop: 4,
            color: "#94a3b8",
          }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0" }}>{project.name}</h1>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
              background: `${statusColor}18`,
              border: `1px solid ${statusColor}40`,
              color: statusColor,
            }}>
              {STATUS_LABELS[project.status]}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>{project.code}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b" }}>
              <Calendar style={{ width: 13, height: 13 }} />
              {new Date(project.startDate).toLocaleDateString("fr-CA")}
              {project.endDate && ` → ${new Date(project.endDate).toLocaleDateString("fr-CA")}`}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b" }}>
              <Users style={{ width: 13, height: 13 }} />
              {project.members.length} membre{project.members.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ marginTop: 16 }}>
            <ARCStatusStepper projectId={id} currentStatus={project.arcStatus as any} />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, padding: "14px 18px", marginBottom: 24,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>Avancement</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
              {progress}% — {doneTasks}/{totalTasks} tâches complétées
            </span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3, transition: "width 0.6s ease",
              width: `${progress}%`,
              background: progress >= 100
                ? "#4ade80"
                : progress >= 60
                ? "linear-gradient(90deg, #22d3ee, #4ade80)"
                : "linear-gradient(90deg, #22d3ee, #06b6d4)",
            }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <ProjectTabs tabs={tabs} panels={tabPanels} />
    </div>
  )
}
