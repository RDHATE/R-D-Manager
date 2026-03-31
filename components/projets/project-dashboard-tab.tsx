"use client"

import Link from "next/link"
import { CheckSquare, Users, Flag, Clock } from "lucide-react"

interface Props {
  projectId: string
  projectName: string
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    isMilestone?: boolean
    isRDEligible?: boolean
    estimatedHours?: number | null
    assignee?: { name: string } | null
    children: Array<{ id: string; status: string }>
  }>
  members: Array<{ id: string; name: string }>
  milestones: Array<{ id: string; title: string; dueDate: Date | string; completed: boolean }>
  statuses: Array<{ id: string; label: string; color: string }>
}

function Donut({
  pct, size = 160, stroke = 16, color = "#06b6d4", label, sublabel,
}: {
  pct: number; size?: number; stroke?: number; color?: string; label: string; sublabel?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-2xl font-bold" style={{ color, textShadow: `0 0 20px ${color}` }}>{label}</div>
        {sublabel && <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  )
}

const TASK_STATUS_NEON: Record<string, string> = {
  TODO: "#64748b",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#f59e0b",
  BLOCKED: "#ef4444",
  DONE: "#10b981",
  ABANDONED: "#6b7280",
}

const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  IN_REVIEW: "En révision",
  BLOCKED: "Bloqué",
  DONE: "Terminé",
  ABANDONED: "Abandonné",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#64748b",
  MEDIUM: "#3b82f6",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
}

export default function ProjectDashboardTab({
  projectId, projectName, tasks, members, milestones, statuses,
}: Props) {
  const cardStyle: React.CSSProperties = {
    background: "rgba(6,182,212,0.04)",
    border: "1px solid rgba(6,182,212,0.15)",
    boxShadow: "0 0 30px rgba(6,182,212,0.08), inset 0 1px 0 rgba(255,255,255,0.03)",
  }

  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === "DONE").length
  const inProgressTasks = tasks.filter(t => t.status === "IN_PROGRESS").length
  const rdEligible = tasks.filter(t => t.isRDEligible).length
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  // Tasks per status
  const taskStatusCounts = (["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "ABANDONED"] as const).map(st => ({
    status: st,
    count: tasks.filter(t => t.status === st).length,
    color: TASK_STATUS_NEON[st],
    label: TASK_STATUS_LABELS[st],
  }))
  const maxStatusCount = Math.max(...taskStatusCounts.map(s => s.count), 1)

  // Team workload: tasks per member
  const memberWorkload = members.map(m => ({
    member: m,
    count: tasks.filter(t => t.assignee?.name === m.name).length,
  })).sort((a, b) => b.count - a.count)
  const maxWorkload = Math.max(...memberWorkload.map(w => w.count), 1)

  // Upcoming milestones (sorted by dueDate, not completed)
  const upcomingMilestones = [...milestones]
    .filter(ms => !ms.completed)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5)

  const now = new Date()

  const kpis = [
    {
      label: "Total tâches",
      value: totalTasks,
      color: "#06b6d4",
      icon: <CheckSquare className="h-5 w-5" />,
    },
    {
      label: "Complétées",
      value: doneTasks,
      sub: `${completionPct}%`,
      color: "#10b981",
      icon: <CheckSquare className="h-5 w-5" />,
    },
    {
      label: "En cours",
      value: inProgressTasks,
      color: "#3b82f6",
      icon: <Clock className="h-5 w-5" />,
    },
    {
      label: "RS&DE éligibles",
      value: rdEligible,
      color: "#8b5cf6",
      icon: <Flag className="h-5 w-5" />,
    },
  ]

  return (
    <div
      className="p-5 space-y-5 min-h-screen rounded-2xl"
      style={{
        backgroundColor: "#030c1a",
        backgroundImage: `
          linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px",
      }}
    >

      {/* Header */}
      <div className="flex items-center gap-3">
        <h2
          className="text-lg font-black tracking-widest uppercase"
          style={{ color: "#06b6d4", textShadow: "0 0 20px rgba(6,182,212,0.5)" }}
        >
          Dashboard — {projectName}
        </h2>
        <div
          className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase"
          style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}
        >
          Vue d&apos;ensemble
        </div>
      </div>

      {/* Row 1: KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div
            key={i}
            className="rounded-2xl p-4 transition-all duration-300"
            style={{
              background: `${k.color}08`,
              border: `1px solid ${k.color}30`,
              boxShadow: `0 0 20px ${k.color}10`,
            }}
          >
            <div
              className="mb-3"
              style={{ color: k.color, filter: `drop-shadow(0 0 6px ${k.color})` }}
            >
              {k.icon}
            </div>
            <p
              className="text-3xl font-black leading-none mb-1"
              style={{ color: k.color, textShadow: `0 0 20px ${k.color}80` }}
            >
              {k.value}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">{k.label}</p>
            {k.sub && (
              <p className="text-[10px] mt-0.5 font-semibold" style={{ color: k.color }}>
                {k.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Donut: task completion */}
        <div className="rounded-2xl p-5 flex flex-col items-center" style={cardStyle}>
          <p
            className="text-xs font-bold tracking-widest uppercase mb-4 self-start"
            style={{ color: "#10b981", textShadow: "0 0 10px rgba(16,185,129,0.5)" }}
          >
            Complétion
          </p>
          <Donut
            pct={completionPct}
            size={150}
            stroke={16}
            color="#10b981"
            label={`${completionPct}%`}
            sublabel="terminées"
          />
          <div className="mt-4 flex items-center gap-6 text-center">
            <div>
              <p
                className="text-2xl font-black"
                style={{ color: "#10b981", textShadow: "0 0 15px rgba(16,185,129,0.5)" }}
              >
                {doneTasks}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Terminées</p>
            </div>
            <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div>
              <p className="text-2xl font-black text-slate-300">{totalTasks}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total</p>
            </div>
          </div>
        </div>

        {/* Center: Status bars */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <p
            className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: "#3b82f6", textShadow: "0 0 10px rgba(59,130,246,0.5)" }}
          >
            Statuts des tâches
          </p>
          <div className="space-y-3">
            {taskStatusCounts.map(({ status, count, color, label }) => {
              const barPct = Math.round((count / maxStatusCount) * 100)
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400">{label}</span>
                    <span className="text-[11px] font-bold" style={{ color }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
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
        </div>

        {/* Right: Team workload */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4" style={{ color: "#f97316", filter: "drop-shadow(0 0 6px #f97316)" }} />
            <p
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: "#f97316", textShadow: "0 0 10px rgba(249,115,22,0.5)" }}
            >
              Charge de l&apos;équipe
            </p>
          </div>
          {memberWorkload.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Aucun membre assigné.</p>
          ) : (
            <div className="space-y-3">
              {memberWorkload.map(({ member, count }) => {
                const barPct = Math.round((count / maxWorkload) * 100)
                const initials = member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
                return (
                  <div key={member.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                        style={{
                          background: "rgba(249,115,22,0.15)",
                          border: "1px solid rgba(249,115,22,0.3)",
                          color: "#f97316",
                        }}
                      >
                        {initials}
                      </div>
                      <span className="text-[11px] text-slate-400 flex-1 truncate">{member.name}</span>
                      <span className="text-[11px] font-bold" style={{ color: "#f97316" }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${barPct}%`,
                          background: "#f97316",
                          boxShadow: "0 0 8px rgba(249,115,22,0.6)",
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Upcoming milestones */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div
          className="flex items-center gap-2.5 px-5 py-4"
          style={{ borderBottom: "1px solid rgba(139,92,246,0.15)" }}
        >
          <Flag className="h-4 w-4" style={{ color: "#8b5cf6", filter: "drop-shadow(0 0 6px #8b5cf6)" }} />
          <p
            className="text-sm font-bold tracking-wider uppercase"
            style={{ color: "#8b5cf6" }}
          >
            Jalons à venir
          </p>
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{
              background: "rgba(139,92,246,0.1)",
              color: "#8b5cf6",
              border: "1px solid rgba(139,92,246,0.3)",
            }}
          >
            {upcomingMilestones.length} en attente
          </span>
        </div>
        {upcomingMilestones.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">Aucun jalon à venir.</div>
        ) : (
          <div>
            {upcomingMilestones.map((ms, i) => {
              const dueDate = new Date(ms.dueDate)
              const isOverdue = dueDate < now
              const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              const urgencyColor = isOverdue ? "#ef4444" : diffDays <= 7 ? "#f97316" : diffDays <= 14 ? "#f59e0b" : "#10b981"
              return (
                <div
                  key={ms.id}
                  className="flex items-center gap-4 px-5 py-3.5"
                  style={{
                    borderBottom: i < upcomingMilestones.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    borderLeft: `3px solid ${urgencyColor}`,
                    paddingLeft: "17px",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: `${urgencyColor}18`,
                      border: `1px solid ${urgencyColor}40`,
                    }}
                  >
                    <Flag className="h-3.5 w-3.5" style={{ color: urgencyColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{ms.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: urgencyColor }}>
                      {dueDate.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}
                      {isOverdue
                        ? " — En retard !"
                        : diffDays === 0
                        ? " — Aujourd'hui"
                        : diffDays === 1
                        ? " — Demain"
                        : ` — Dans ${diffDays} jours`}
                    </p>
                  </div>
                  <div
                    className="text-[10px] px-2.5 py-1 rounded-full font-bold shrink-0"
                    style={{
                      background: `${urgencyColor}18`,
                      color: urgencyColor,
                      border: `1px solid ${urgencyColor}40`,
                      textShadow: `0 0 8px ${urgencyColor}60`,
                    }}
                  >
                    {isOverdue ? "EN RETARD" : diffDays <= 7 ? "URGENT" : diffDays <= 14 ? "BIENTÔT" : "PLANIFIÉ"}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
