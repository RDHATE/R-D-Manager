"use client"

import { useState, useEffect } from "react"
import { useThemeColors } from "@/hooks/use-theme-colors"
import Link from "next/link"
import {
  FolderKanban, CheckSquare, Clock, TrendingUp, DollarSign,
  AlertTriangle, BookOpen, FlaskConical, ChevronRight, CheckCircle2,
  Zap, ArrowUpRight, ArrowRight,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface KPI {
  label: string
  value: string | number
  sub?: string
  subColor?: string
  color: string
  icon: React.ReactNode
  href: string
}

interface ProjectItem {
  id: string
  name: string
  code: string
  status: string
  arcStatus?: string
  _count: { tasks: number; members: number }
}

interface TaskItem {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  project: { id: string; name: string; code: string }
}

interface JournalItem {
  id: string
  content: string
  type: string
  createdAt: string
  project: { code: string }
  author: { name: string }
}

interface Props {
  kpis: KPI[]
  projects: ProjectItem[]
  myTasks: TaskItem[]
  recentJournal: JournalItem[]
  totalTaskCount: number
  doneTaskCount: number
  overdueCount: number
  pendingApprovals: number
  testsCount: number
  journalCount: number
  totalSpent: number
  totalBudget: number
  budgetPct: number | null
  totalHours: number
  activeProjects: number
  taskCompletionPct: number
  STATUS_LABELS: Record<string, string>
  TASK_STATUS_LABELS: Record<string, string>
  TASK_STATUS_NEON: Record<string, string>
  PROJECT_STATUS_NEON: Record<string, string>
  JOURNAL_TYPES: Record<string, { label: string; color: string }>
  PRIORITY_COLORS: Record<string, string>
  ARC_LABELS: Record<string, string>
  projectsByStatus: { status: string; _count: number }[]
  tasksByStatus: { status: string; _count: number }[]
  now: string
  userName: string
}

// ── Donut chart (futuriste only) ──────────────────────────────────────────────

function Donut({ pct, size = 160, stroke = 16, color = "#06b6d4", label, sublabel }: {
  pct: number; size?: number; stroke?: number; color?: string; label: string; sublabel?: string
}) {
  const dark = useThemeColors()
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark.border} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
      <div className="text-center z-10">
        <div className="text-2xl font-bold" style={{ color, textShadow: `0 0 20px ${color}` }}>{label}</div>
        {sublabel && <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

export function DashboardClient(props: Props) {
  const {
    kpis, projects, myTasks, recentJournal,
    totalTaskCount, doneTaskCount, overdueCount, pendingApprovals,
    testsCount, journalCount, totalSpent, totalBudget, budgetPct,
    totalHours, activeProjects, taskCompletionPct,
    STATUS_LABELS, TASK_STATUS_LABELS, TASK_STATUS_NEON, PROJECT_STATUS_NEON,
    JOURNAL_TYPES, PRIORITY_COLORS, ARC_LABELS,
    projectsByStatus, tasksByStatus, now, userName,
  } = props

  const [viewMode, setViewMode] = useState<"futuriste" | "classique">("futuriste")

  useEffect(() => {
    const saved = localStorage.getItem("dashboard-view-mode")
    if (saved === "futuriste" || saved === "classique") {
      setViewMode(saved)
    }
    // Vérifier les tâches en retard en arrière-plan (fire & forget)
    fetch("/api/taches/overdue", { method: "POST" }).catch(() => {})
  }, [])

  const fmt = (n: number) => n.toLocaleString("fr-CA", { maximumFractionDigits: 0 }) + " $"

  const nowDate = new Date(now)

  const toggleButton = (
    <button
      onClick={() => {
        const next = viewMode === "futuriste" ? "classique" : "futuriste"
        setViewMode(next)
        localStorage.setItem("dashboard-view-mode", next)
      }}
      style={{
        background: viewMode === "futuriste" ? "rgba(6,182,212,0.1)" : "rgba(99,102,241,0.1)",
        border: `1px solid ${viewMode === "futuriste" ? "rgba(6,182,212,0.3)" : "rgba(99,102,241,0.3)"}`,
        color: viewMode === "futuriste" ? "#06b6d4" : "#6366f1",
        borderRadius: 10,
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {viewMode === "futuriste" ? "☀️ Vue classique" : "🌙 Vue futuriste"}
    </button>
  )

  if (viewMode === "classique") {
    return <ClassiqueView {...props} fmt={fmt} nowDate={nowDate} toggleButton={toggleButton} />
  }

  return <FuturisteView {...props} fmt={fmt} nowDate={nowDate} toggleButton={toggleButton} />
}

// ── FUTURISTE VIEW ────────────────────────────────────────────────────────────

function FuturisteView(props: Props & { fmt: (n: number) => string; nowDate: Date; toggleButton: React.ReactNode }) {
  const dark = useThemeColors()
  const {
    kpis, projects, myTasks, recentJournal,
    totalTaskCount, doneTaskCount, pendingApprovals,
    testsCount, journalCount, totalSpent, totalBudget, budgetPct,
    taskCompletionPct,
    STATUS_LABELS, TASK_STATUS_LABELS, TASK_STATUS_NEON, PROJECT_STATUS_NEON,
    JOURNAL_TYPES, PRIORITY_COLORS, ARC_LABELS,
    projectsByStatus, tasksByStatus, nowDate, fmt, toggleButton, userName,
  } = props

  const cardStyle: React.CSSProperties = {
    background: dark.isDark ? "rgba(6,182,212,0.04)" : "#ffffff",
    border: dark.isDark ? "1px solid rgba(6,182,212,0.15)" : `1px solid ${dark.border}`,
    boxShadow: dark.isDark ? "0 0 30px rgba(6,182,212,0.08), inset 0 1px 0 rgba(255,255,255,0.03)" : dark.shadow,
  }

  return (
    <div
      className="p-6 space-y-6 min-h-screen"
      style={{
        backgroundColor: dark.bg,
        backgroundImage: dark.isDark ? `
          linear-gradient(rgba(6,182,212,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6,182,212,0.05) 1px, transparent 1px)
        ` : "none",
        backgroundSize: "40px 40px",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1
              className="text-2xl font-bold tracking-widest uppercase"
              style={{ color: "#06b6d4", textShadow: "0 0 30px rgba(6,182,212,0.6)" }}
            >
              Tableau de bord
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#10b981" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#10b981" }} />
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#10b981" }}>
                Système opérationnel
              </span>
            </div>
          </div>
          <p className="text-slate-400 mt-0.5 text-sm">
            Bonjour, <strong className="text-slate-200">{userName}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {toggleButton}
          <span
            className="text-xs px-3 py-1.5 rounded-full font-mono tracking-wider"
            style={{
              color: "#06b6d4",
              background: "rgba(6,182,212,0.08)",
              border: "1px solid rgba(6,182,212,0.2)",
            }}
          >
            {nowDate.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k, i) => (
          <Link key={i} href={k.href}>
            <div
              className="rounded-2xl p-4 cursor-pointer transition-all duration-300 group hover:-translate-y-1"
              style={{
                background: `rgba(${k.color === "#3b82f6" ? "59,130,246" : k.color === "#8b5cf6" ? "139,92,246" : k.color === "#06b6d4" ? "6,182,212" : k.color === "#10b981" ? "16,185,129" : k.color === "#f97316" ? "249,115,22" : k.color === "#ef4444" ? "239,68,68" : "100,116,139"},0.06)`,
                border: `1px solid ${k.color}33`,
                boxShadow: `0 0 20px ${k.color}15, inset 0 1px 0 rgba(255,255,255,0.03)`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="p-1.5 rounded-xl"
                  style={{ color: k.color, filter: `drop-shadow(0 0 6px ${k.color})` }}
                >
                  {k.icon}
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
              <p
                className="text-2xl font-bold leading-none mb-1"
                style={{ color: k.color, textShadow: `0 0 20px ${k.color}80` }}
              >
                {k.value}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">{k.label}</p>
              {k.sub && (
                <p className="text-[10px] mt-0.5 font-semibold" style={{ color: k.subColor ?? "#64748b" }}>
                  {k.sub}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* ── Charts section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Donut: Projects by status */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <p className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: "#06b6d4", textShadow: "0 0 10px rgba(6,182,212,0.5)" }}>
            Projets par statut
          </p>
          <div className="flex flex-col items-center gap-4">
            <Donut
              pct={projectsByStatus.find(s => s.status === "ACTIVE")?._count ?? 0 > 0
                ? Math.round(((projectsByStatus.find(s => s.status === "ACTIVE")?._count ?? 0) / projects.length) * 100)
                : 0}
              size={140}
              stroke={14}
              color="#06b6d4"
              label={String(projectsByStatus.find(s => s.status === "ACTIVE")?._count ?? 0)}
              sublabel="actifs"
            />
            <div className="w-full space-y-2">
              {(["ACTIVE", "DRAFT", "COMPLETED", "ARCHIVED"] as const).map(st => {
                const count = projectsByStatus.find(s => s.status === st)?._count ?? 0
                const color = PROJECT_STATUS_NEON[st]
                const total = projects.length || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={st} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                    <span className="text-xs text-slate-400 flex-1">{STATUS_LABELS[st]}</span>
                    <span className="text-xs font-bold" style={{ color }}>{count}</span>
                    <div className="w-16 h-1.5 rounded-full" style={{ background: dark.isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 4px ${color}` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Center: Task completion circle */}
        <div className="rounded-2xl p-5 flex flex-col items-center justify-center" style={cardStyle}>
          <p className="text-xs font-bold tracking-widest uppercase mb-4 self-start"
            style={{ color: "#10b981", textShadow: "0 0 10px rgba(16,185,129,0.5)" }}>
            Complétion des tâches
          </p>
          <Donut
            pct={taskCompletionPct}
            size={160}
            stroke={18}
            color="#10b981"
            label={`${taskCompletionPct}%`}
            sublabel="terminées"
          />
          <div className="mt-4 flex items-center gap-6 text-center">
            <div>
              <p className="text-2xl font-black" style={{ color: "#10b981", textShadow: "0 0 15px rgba(16,185,129,0.5)" }}>
                {doneTaskCount}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Terminées</p>
            </div>
            <div className="w-px h-8" style={{ background: dark.isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0" }} />
            <div>
              <p className="text-2xl font-black text-slate-300">{totalTaskCount}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total</p>
            </div>
          </div>
        </div>

        {/* Right: Task status bars */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <p className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: "#8b5cf6", textShadow: "0 0 10px rgba(139,92,246,0.5)" }}>
            Statuts des tâches
          </p>
          <div className="space-y-3">
            {(["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "ABANDONED"] as const).map(st => {
              const entry = tasksByStatus.find(s => s.status === st)
              const count = entry?._count ?? 0
              const color = TASK_STATUS_NEON[st]
              const maxCount = Math.max(...tasksByStatus.map(s => s._count), 1)
              const barPct = Math.round((count / maxCount) * 100)
              return (
                <div key={st}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400">{TASK_STATUS_LABELS[st]}</span>
                    <span className="text-[11px] font-bold" style={{ color }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: dark.isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${barPct}%`,
                        background: color,
                        boxShadow: `0 0 8px ${color}80`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Budget global inline */}
          {totalBudget > 0 && (
            <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${dark.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">Budget global</span>
                <span
                  className="text-sm font-black"
                  style={{
                    color: (budgetPct ?? 0) >= 100 ? "#ef4444" : (budgetPct ?? 0) >= 90 ? "#f97316" : "#10b981",
                    textShadow: `0 0 10px ${(budgetPct ?? 0) >= 100 ? "#ef4444" : (budgetPct ?? 0) >= 90 ? "#f97316" : "#10b981"}80`,
                  }}
                >
                  {budgetPct}%
                </span>
              </div>
              <div className="h-2 rounded-full" style={{ background: dark.isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(budgetPct ?? 0, 100)}%`,
                    background: (budgetPct ?? 0) >= 100 ? "#ef4444" : (budgetPct ?? 0) >= 90 ? "#f97316" : "#10b981",
                    boxShadow: `0 0 8px ${(budgetPct ?? 0) >= 100 ? "#ef4444" : (budgetPct ?? 0) >= 90 ? "#f97316" : "#10b981"}80`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
                <span>{fmt(totalSpent)}</span>
                <span>{fmt(totalBudget)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Grille principale ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Projets récents */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={cardStyle}>
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(6,182,212,0.1)" }}
          >
            <div className="flex items-center gap-2.5">
              <FolderKanban className="h-4 w-4" style={{ color: "#06b6d4", filter: "drop-shadow(0 0 6px #06b6d4)" }} />
              <p className="text-sm font-bold tracking-wider uppercase" style={{ color: "#06b6d4" }}>Projets récents</p>
            </div>
            <Link href="/projets" className="flex items-center gap-1 text-xs font-semibold transition-colors"
              style={{ color: "#06b6d460" }}>
              Tous les projets <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {projects.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">Aucun projet. Créez votre premier projet R&D.</div>
          ) : (
            <div>
              {projects.map((p, i) => {
                const neonColor = PROJECT_STATUS_NEON[p.status] ?? "#64748b"
                return (
                  <Link key={p.id} href={`/projets/${p.id}`}>
                    <div
                      className="flex items-center gap-4 px-5 py-3.5 transition-all duration-200 group cursor-pointer hover:bg-white/[0.03]"
                      style={{
                        borderBottom: i < projects.length - 1 ? `1px solid ${dark.border}` : "none",
                        borderLeft: `3px solid ${neonColor}`,
                        paddingLeft: "17px",
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-black"
                        style={{
                          background: `${neonColor}18`,
                          border: `1px solid ${neonColor}40`,
                          color: neonColor,
                          textShadow: `0 0 10px ${neonColor}`,
                        }}
                      >
                        {p.code.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200 truncate">{p.name}</span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0"
                            style={{
                              background: `${neonColor}18`,
                              color: neonColor,
                              border: `1px solid ${neonColor}40`,
                            }}
                          >
                            {STATUS_LABELS[p.status]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {p.code} · {p._count.tasks} tâches · {ARC_LABELS[p.arcStatus ?? "DRAFT"]}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Stats rapides RS&DE */}
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div
              className="flex items-center gap-2.5 px-5 py-4"
              style={{ borderBottom: "1px solid rgba(6,182,212,0.1)" }}
            >
              <Zap className="h-4 w-4" style={{ color: "#10b981", filter: "drop-shadow(0 0 6px #10b981)" }} />
              <p className="text-sm font-bold tracking-wider uppercase" style={{ color: "#10b981" }}>Activité RS&DE</p>
            </div>
            <div className="p-3 space-y-2">
              {[
                { icon: FlaskConical, label: "Tests & expériences", value: testsCount, href: "/tests", color: "#10b981" },
                { icon: BookOpen, label: "Journal ce mois", value: journalCount, href: "/journal", color: "#8b5cf6" },
              ].map(({ icon: Icon, label, value, href, color }) => (
                <Link key={href} href={href}>
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:opacity-80"
                    style={{
                      background: `${color}0a`,
                      border: `1px solid ${color}25`,
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color, filter: `drop-shadow(0 0 4px ${color})` }} />
                    <span className="text-xs flex-1 text-slate-400 font-medium">{label}</span>
                    <span className="text-xl font-black" style={{ color, textShadow: `0 0 15px ${color}80` }}>{value}</span>
                  </div>
                </Link>
              ))}
              {pendingApprovals > 0 && (
                <Link href="/depenses?tab=approbations">
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200"
                    style={{ background: "#f9731610", border: "1px solid #f9731630" }}
                  >
                    <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" style={{ filter: "drop-shadow(0 0 4px #f97316)" }} />
                    <span className="text-xs flex-1 text-orange-400 font-medium">Dépenses à approuver</span>
                    <span className="text-xl font-black" style={{ color: "#f97316", textShadow: "0 0 15px #f9731680" }}>{pendingApprovals}</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mes tâches + Journal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Mes tâches */}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(139,92,246,0.15)" }}
          >
            <div className="flex items-center gap-2.5">
              <CheckSquare className="h-4 w-4" style={{ color: "#8b5cf6", filter: "drop-shadow(0 0 6px #8b5cf6)" }} />
              <p className="text-sm font-bold tracking-wider uppercase" style={{ color: "#8b5cf6" }}>Mes tâches</p>
            </div>
            <Link href="/taches?assignee=me"
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: "#8b5cf660" }}>
              Toutes <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {myTasks.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">Aucune tâche assignée.</div>
          ) : (
            <div>
              {myTasks.map((t, i) => {
                const isOverdue = t.dueDate && new Date(t.dueDate) < nowDate
                const dotColor = PRIORITY_COLORS[t.priority] ?? "#64748b"
                const statusColor = TASK_STATUS_NEON[t.status] ?? "#64748b"
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-5 py-3"
                    style={{ borderBottom: i < myTasks.length - 1 ? `1px solid ${dark.border}` : "none" }}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-300 truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <Link href={`/projets/${t.project.id}`} className="hover:text-cyan-400 transition-colors">{t.project.code}</Link>
                        {t.dueDate && (
                          <span style={{ color: isOverdue ? "#ef4444" : undefined }}>
                            {new Date(t.dueDate).toLocaleDateString("fr-CA", { month: "short", day: "numeric" })}
                            {isOverdue && " !"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0"
                      style={{
                        background: `${statusColor}18`,
                        color: statusColor,
                        border: `1px solid ${statusColor}40`,
                      }}
                    >
                      {TASK_STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Journal récent */}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(249,115,22,0.15)" }}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="h-4 w-4" style={{ color: "#f97316", filter: "drop-shadow(0 0 6px #f97316)" }} />
              <p className="text-sm font-bold tracking-wider uppercase" style={{ color: "#f97316" }}>Journal de bord</p>
            </div>
            <Link href="/journal"
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: "#f9731660" }}>
              Voir tout <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentJournal.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">Aucune entrée dans le journal.</div>
          ) : (
            <div>
              {recentJournal.map((j, i) => {
                const typeCfg = JOURNAL_TYPES[j.type] ?? JOURNAL_TYPES.GENERAL
                return (
                  <div
                    key={j.id}
                    className="flex items-start gap-3 px-5 py-3.5"
                    style={{ borderBottom: i < recentJournal.length - 1 ? `1px solid ${dark.border}` : "none" }}
                  >
                    <span
                      className="text-[10px] px-2 py-1 rounded-lg font-bold shrink-0 mt-0.5"
                      style={{
                        background: `${typeCfg.color}20`,
                        color: typeCfg.color,
                        border: `1px solid ${typeCfg.color}40`,
                        textShadow: `0 0 8px ${typeCfg.color}60`,
                      }}
                    >
                      {typeCfg.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 leading-snug line-clamp-2">{j.content}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <CheckCircle2 className="h-2.5 w-2.5" style={{ color: "#10b981" }} />
                        <span className="font-medium text-slate-400">{j.project.code}</span>
                        <span>{new Date(j.createdAt).toLocaleDateString("fr-CA", { month: "short", day: "numeric" })}</span>
                        <span>{j.author.name.split(" ")[0]}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── CLASSIQUE VIEW ────────────────────────────────────────────────────────────

function ClassiqueView(props: Props & { fmt: (n: number) => string; nowDate: Date; toggleButton: React.ReactNode }) {
  const {
    kpis, projects, myTasks, recentJournal,
    totalTaskCount, doneTaskCount, overdueCount, pendingApprovals,
    testsCount, journalCount, totalSpent, totalBudget, budgetPct,
    totalHours, activeProjects, taskCompletionPct,
    STATUS_LABELS, TASK_STATUS_LABELS, TASK_STATUS_NEON, PROJECT_STATUS_NEON,
    JOURNAL_TYPES, PRIORITY_COLORS, ARC_LABELS,
    nowDate, fmt, toggleButton, userName,
  } = props

  const kpiColors = [
    { light: "#eff6ff", dark: "#dbeafe", shadow: "rgba(59,130,246,0.15)", accent: "#2563eb" },   // blue
    { light: "#f5f3ff", dark: "#ede9fe", shadow: "rgba(139,92,246,0.15)", accent: "#7c3aed" },   // purple
    { light: "#ecfeff", dark: "#cffafe", shadow: "rgba(6,182,212,0.15)", accent: "#0891b2" },    // cyan
    { light: "#f0fdf4", dark: "#dcfce7", shadow: "rgba(16,185,129,0.15)", accent: "#059669" },   // green
    { light: "#fff7ed", dark: "#fed7aa", shadow: "rgba(249,115,22,0.15)", accent: "#ea580c" },   // orange
    { light: "#fef2f2", dark: "#fecaca", shadow: "rgba(239,68,68,0.15)", accent: "#dc2626" },    // red
  ]

  const statusBorderColors: Record<string, string> = {
    ACTIVE: "#2563eb",
    DRAFT: "#64748b",
    COMPLETED: "#059669",
    ARCHIVED: "#94a3b8",
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Bonjour, <strong className="text-slate-700">{userName}</strong> &mdash;{" "}
            {nowDate.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {toggleButton}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((k, i) => {
          const c = kpiColors[i] ?? kpiColors[0]
          return (
            <Link key={i} href={k.href}>
              <div
                className="rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${c.light}, ${c.dark})`,
                  borderRadius: 16,
                  padding: "20px",
                  boxShadow: `0 8px 24px ${c.shadow}, inset 0 1px 0 rgba(255,255,255,0.15)`,
                }}
              >
                <div className="mb-3" style={{ color: c.accent }}>{k.icon}</div>
                <p className="text-2xl font-bold text-white leading-none mb-1" style={{ color: c.accent }}>{k.value}</p>
                <p className="text-xs font-semibold text-slate-600">{k.label}</p>
                {k.sub && (
                  <p className="text-[10px] mt-0.5 font-semibold" style={{ color: k.subColor ? k.subColor : c.accent }}>
                    {k.sub}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Progress bars row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Complétion tâches */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">Complétion des tâches</span>
            <span className="text-sm font-bold text-emerald-600">{taskCompletionPct}%</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${taskCompletionPct}%`, background: "linear-gradient(90deg, #10b981, #34d399)" }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>{doneTaskCount} terminées</span>
            <span>{totalTaskCount} au total</span>
          </div>
        </div>

        {/* Budget global */}
        {totalBudget > 0 ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">Budget global</span>
              <span
                className="text-sm font-bold"
                style={{ color: (budgetPct ?? 0) >= 100 ? "#dc2626" : (budgetPct ?? 0) >= 90 ? "#ea580c" : "#059669" }}
              >
                {budgetPct}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(budgetPct ?? 0, 100)}%`,
                  background: (budgetPct ?? 0) >= 100
                    ? "linear-gradient(90deg, #dc2626, #ef4444)"
                    : (budgetPct ?? 0) >= 90
                    ? "linear-gradient(90deg, #ea580c, #f97316)"
                    : "linear-gradient(90deg, #059669, #10b981)",
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>{fmt(totalSpent)} dépensés</span>
              <span>{fmt(totalBudget)} planifiés</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-center">
            <p className="text-sm text-slate-400">Aucun budget planifié</p>
          </div>
        )}
      </div>

      {/* ── Projets + Activité RS&DE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Projets récents */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-slate-700">Projets récents</span>
            </div>
            <Link href="/projets" className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
              Tous <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {projects.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Aucun projet. Créez votre premier projet R&D.</div>
          ) : (
            <div>
              {projects.map((p, i) => {
                const borderColor = statusBorderColors[p.status] ?? "#94a3b8"
                const badgeBg: Record<string, string> = {
                  ACTIVE: "bg-blue-50 text-blue-700",
                  DRAFT: "bg-slate-100 text-slate-600",
                  COMPLETED: "bg-emerald-50 text-emerald-700",
                  ARCHIVED: "bg-slate-50 text-slate-500",
                }
                return (
                  <Link key={p.id} href={`/projets/${p.id}`}>
                    <div
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                      style={{
                        borderBottom: i < projects.length - 1 ? "1px solid #f1f5f9" : "none",
                        borderLeft: `3px solid ${borderColor}`,
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-black text-white"
                        style={{ background: borderColor }}
                      >
                        {p.code.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${badgeBg[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {STATUS_LABELS[p.status]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {p.code} · {p._count.tasks} tâches · {ARC_LABELS[p.arcStatus ?? "DRAFT"]}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Activité RS&DE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Zap className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-700">Activité RS&DE</span>
          </div>
          <div className="p-4 space-y-3">
            <Link href="/tests">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors">
                <FlaskConical className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-xs flex-1 text-emerald-700 font-medium">Tests & expériences</span>
                <span className="text-xl font-black text-emerald-700">{testsCount}</span>
              </div>
            </Link>
            <Link href="/journal">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors">
                <BookOpen className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="text-xs flex-1 text-purple-700 font-medium">Journal ce mois</span>
                <span className="text-xl font-black text-purple-700">{journalCount}</span>
              </div>
            </Link>
            {pendingApprovals > 0 && (
              <Link href="/depenses?tab=approbations">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors">
                  <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
                  <span className="text-xs flex-1 text-orange-700 font-medium">Dépenses à approuver</span>
                  <span className="text-xl font-black text-orange-700">{pendingApprovals}</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Mes tâches + Journal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Mes tâches */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-semibold text-slate-700">Mes tâches</span>
            </div>
            <Link href="/taches?assignee=me" className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
              Toutes <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {myTasks.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Aucune tâche assignée.</div>
          ) : (
            <div>
              {myTasks.map((t, i) => {
                const isOverdue = t.dueDate && new Date(t.dueDate) < nowDate
                const statusColor = TASK_STATUS_NEON[t.status] ?? "#64748b"
                const dotColor = PRIORITY_COLORS[t.priority] ?? "#64748b"
                const statusBadgeBg: Record<string, string> = {
                  TODO: "bg-slate-100 text-slate-600",
                  IN_PROGRESS: "bg-blue-50 text-blue-700",
                  IN_REVIEW: "bg-amber-50 text-amber-700",
                  BLOCKED: "bg-red-50 text-red-700",
                  DONE: "bg-emerald-50 text-emerald-700",
                  ABANDONED: "bg-slate-50 text-slate-500",
                }
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-5 py-3"
                    style={{ borderBottom: i < myTasks.length - 1 ? "1px solid #f1f5f9" : "none" }}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: dotColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <Link href={`/projets/${t.project.id}`} className="hover:text-blue-600 transition-colors">{t.project.code}</Link>
                        {t.dueDate && (
                          <span style={{ color: isOverdue ? "#dc2626" : undefined }}>
                            {new Date(t.dueDate).toLocaleDateString("fr-CA", { month: "short", day: "numeric" })}
                            {isOverdue && " !"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${statusBadgeBg[t.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {TASK_STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Journal récent */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-slate-700">Journal de bord</span>
            </div>
            <Link href="/journal" className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
              Voir tout <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentJournal.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Aucune entrée dans le journal.</div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[28px] top-4 bottom-4 w-px bg-slate-100" />
              {recentJournal.map((j, i) => {
                const typeCfg = JOURNAL_TYPES[j.type] ?? JOURNAL_TYPES.GENERAL
                return (
                  <div
                    key={j.id}
                    className="flex items-start gap-3 px-5 py-3.5"
                    style={{ borderBottom: i < recentJournal.length - 1 ? "1px solid #f1f5f9" : "none" }}
                  >
                    {/* Colored dot on timeline */}
                    <div
                      className="w-3 h-3 rounded-full shrink-0 mt-1 z-10 ring-2 ring-white"
                      style={{ background: typeCfg.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{ background: `${typeCfg.color}15`, color: typeCfg.color }}
                        >
                          {typeCfg.label}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{j.project.code}</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-snug line-clamp-2">{j.content}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span>{new Date(j.createdAt).toLocaleDateString("fr-CA", { month: "short", day: "numeric" })}</span>
                        <span>·</span>
                        <span>{j.author.name.split(" ")[0]}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
