"use client"
import { useThemeColors } from "@/hooks/use-theme-colors"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  FolderKanban, Plus, Search, Users, CheckSquare, Clock,
  Calendar, ChevronRight, LayoutGrid, LayoutList, Beaker,
  GitBranch, Zap, TrendingUp, Filter,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────
type Project = {
  id: string; name: string; code: string; description: string | null
  status: string; arcStatus: string; trlLevel: number; currentGate: number
  startDate: string; endDate: string | null; updatedAt: string
  _count: { tasks: number; members: number; timeEntries: number }
  doneTaskCount: number; hoursLogged: number
  isMember: boolean; memberRole: string | null
}

interface Props {
  projects: Project[]
  canCreate: boolean
}

type DC = ReturnType<typeof useThemeColors>

// ── Config (functions so they can use theme-aware colors) ──────────────────────
function getStatusCfg(dark: DC) {
  return {
    DRAFT:     { label: "Brouillon",  color: dark.sub,   bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)" },
    ACTIVE:    { label: "Actif",      color: "#22d3ee",  bg: "rgba(34,211,238,0.12)",  border: "rgba(34,211,238,0.3)"  },
    COMPLETED: { label: "Terminé",    color: "#4ade80",  bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"  },
    ARCHIVED:  { label: "Archivé",    color: dark.sub,   bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)" },
  } as Record<string, { label: string; color: string; bg: string; border: string }>
}

function getArcCfg(dark: DC) {
  return {
    DRAFT:                { label: "Brouillon",       color: dark.sub    },
    HYPOTHESIS_DEFINED:   { label: "Hypothèses",      color: "#a78bfa"   },
    IN_EXPERIMENTATION:   { label: "Expérimentation", color: "#22d3ee"   },
    ANALYZING_RESULTS:    { label: "Analyse",         color: "#fb923c"   },
    PIVOT:                { label: "Pivot",            color: "#f472b6"   },
    RESULTS_VALIDATED:    { label: "Validé",          color: "#4ade80"   },
    CLOSED:               { label: "Clôturé",         color: dark.sub    },
  } as Record<string, { label: string; color: string }>
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function ProgressBar({ dark, value, max, color }: { dark: DC; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ height: 3, borderRadius: 2, background: dark.hover, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width .4s ease" }} />
    </div>
  )
}

// ── TRL badge ─────────────────────────────────────────────────────────────────
function TRLBadge({ level }: { level: number }) {
  const color = level <= 3 ? "#f472b6" : level <= 6 ? "#fb923c" : "#4ade80"
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 4, padding: "1px 5px" }}>
      TRL {level}
    </span>
  )
}

// ── Project Card ───────────────────────────────────────────────────────────────
function ProjectCard({ dark, p }: { dark: DC; p: Project }) {
  const STATUS_CFG = getStatusCfg(dark)
  const ARC_CFG    = getArcCfg(dark)
  const st  = STATUS_CFG[p.status]  ?? STATUS_CFG.DRAFT
  const arc = ARC_CFG[p.arcStatus]  ?? ARC_CFG.DRAFT
  const taskPct = p._count.tasks > 0 ? Math.round((p.doneTaskCount / p._count.tasks) * 100) : 0
  const updatedAgo = getTimeAgo(p.updatedAt)

  return (
    <Link href={`/projets/${p.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        onMouseEnter={e => {
          e.currentTarget.style.transform = "translateY(-3px)"
          e.currentTarget.style.boxShadow = `0 8px 28px ${st.color}20`
          e.currentTarget.style.borderColor = st.color + "50"
          e.currentTarget.style.background = dark.hover
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "translateY(0)"
          e.currentTarget.style.boxShadow = "none"
          e.currentTarget.style.borderColor = dark.border
          e.currentTarget.style.background = dark.card
        }}
        style={{
          background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 12,
          padding: "18px 20px", cursor: "pointer", height: "100%",
          transition: "all .25s cubic-bezier(.34,1.56,.64,1)",
          boxShadow: dark.shadow,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          {/* Status bar */}
          <div style={{ width: 3, borderRadius: 2, alignSelf: "stretch", minHeight: 40, background: st.color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 4, padding: "1px 6px", fontWeight: 600, flexShrink: 0 }}>
                {p.code}
              </span>
              <span style={{ fontSize: 10, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 4, padding: "1px 6px" }}>
                {st.label}
              </span>
              <TRLBadge level={p.trlLevel} />
              {p.isMember && (
                <span style={{ fontSize: 10, color: "#818cf8", background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.3)", borderRadius: 4, padding: "1px 5px" }}>
                  Mon projet
                </span>
              )}
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 600, color: dark.text, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name}
            </p>
          </div>
        </div>

        {/* Description */}
        {p.description && (
          <p style={{ fontSize: 12, color: dark.sub, margin: "0 0 12px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {p.description}
          </p>
        )}

        {/* ARC status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <Beaker size={11} color={arc.color} />
          <span style={{ fontSize: 11, color: arc.color }}>{arc.label}</span>
        </div>

        {/* Task progress */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: dark.sub }}>Avancement tâches</span>
            <span style={{ fontSize: 11, color: taskPct >= 80 ? "#4ade80" : dark.sub, fontWeight: 600 }}>
              {p.doneTaskCount}/{p._count.tasks} ({taskPct}%)
            </span>
          </div>
          <ProgressBar dark={dark} value={p.doneTaskCount} max={p._count.tasks} color={taskPct >= 80 ? "#4ade80" : taskPct >= 40 ? "#22d3ee" : "#818cf8"} />
        </div>

        {/* Footer stats */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: dark.sub }}>
            <Users size={11} /> {p._count.members} membres
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: dark.sub }}>
            <Clock size={11} /> {Math.round(p.hoursLogged)}h
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: dark.sub }}>
            <Calendar size={11} /> {new Date(p.startDate).toLocaleDateString("fr-CA")}
          </span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: dark.muted }}>
            {updatedAgo}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── List row ───────────────────────────────────────────────────────────────────
function ProjectRow({ dark, p }: { dark: DC; p: Project }) {
  const STATUS_CFG = getStatusCfg(dark)
  const ARC_CFG    = getArcCfg(dark)
  const st  = STATUS_CFG[p.status]  ?? STATUS_CFG.DRAFT
  const arc = ARC_CFG[p.arcStatus]  ?? ARC_CFG.DRAFT
  const taskPct = p._count.tasks > 0 ? Math.round((p.doneTaskCount / p._count.tasks) * 100) : 0

  return (
    <Link href={`/projets/${p.id}`} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={e => { e.currentTarget.style.background = dark.hover; e.currentTarget.style.transform = "translateX(3px)" }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateX(0)" }}
        style={{
          display: "grid", gridTemplateColumns: "3px 1fr 120px 80px 70px 80px 60px 20px",
          alignItems: "center", gap: 16, padding: "12px 16px",
          borderRadius: 8, cursor: "pointer",
          transition: "all .18s ease",
          borderBottom: `1px solid ${dark.border}`,
        }}
      >
        <div style={{ width: 3, height: 32, borderRadius: 2, background: st.color }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "monospace", fontSize: 10, color: st.color }}>{p.code}</span>
            {p.isMember && <span style={{ fontSize: 10, color: "#818cf8" }}>●</span>}
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, color: dark.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
            {p.name}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Beaker size={10} color={arc.color} />
          <span style={{ fontSize: 11, color: arc.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{arc.label}</span>
        </div>
        <div>
          <div style={{ fontSize: 11, color: dark.sub, marginBottom: 3 }}>{taskPct}%</div>
          <ProgressBar dark={dark} value={p.doneTaskCount} max={p._count.tasks} color={taskPct >= 80 ? "#4ade80" : "#22d3ee"} />
        </div>
        <span style={{ fontSize: 11, color: dark.sub, textAlign: "center" }}>{p._count.members}</span>
        <span style={{ fontSize: 11, color: dark.sub }}>{Math.round(p.hoursLogged)}h</span>
        <TRLBadge level={p.trlLevel} />
        <ChevronRight size={14} color={dark.sub} />
      </div>
    </Link>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return "Aujourd'hui"
  if (d === 1) return "Hier"
  if (d < 7)  return `Il y a ${d}j`
  if (d < 30) return `Il y a ${Math.floor(d / 7)}sem`
  return `Il y a ${Math.floor(d / 30)}mois`
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ProjetsClient({ projects: initial, canCreate }: Props) {
  const dark = useThemeColors()
  const [search, setSearch]       = useState("")
  const [filterStatus, setStatus] = useState("ALL")
  const [view, setView]           = useState<"cards" | "list">("cards")

  const filtered = useMemo(() => {
    let list = initial
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
    }
    if (filterStatus !== "ALL") list = list.filter(p => p.status === filterStatus)
    return list
  }, [initial, search, filterStatus])

  const counts = useMemo(() => ({
    all:       initial.length,
    active:    initial.filter(p => p.status === "ACTIVE").length,
    draft:     initial.filter(p => p.status === "DRAFT").length,
    completed: initial.filter(p => p.status === "COMPLETED").length,
    archived:  initial.filter(p => p.status === "ARCHIVED").length,
  }), [initial])

  const totalHours   = initial.reduce((s, p) => s + p.hoursLogged, 0)
  const totalTasks   = initial.reduce((s, p) => s + p._count.tasks, 0)
  const totalDone    = initial.reduce((s, p) => s + p.doneTaskCount, 0)

  const btn = (s: string, label: string, count: number, color: string) => (
    <button
      onClick={() => setStatus(s)}
      style={{
        padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
        border: `1px solid ${filterStatus === s ? color + "60" : dark.border}`,
        background: filterStatus === s ? color + "18" : "transparent",
        color: filterStatus === s ? color : dark.sub,
        transition: "all .15s ease",
      }}
    >
      {label} <span style={{ opacity: .7 }}>{count}</span>
    </button>
  )

  return (
    <div style={{ minHeight: "100vh", background: dark.bg, padding: "32px 40px", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <FolderKanban size={20} color={dark.accent} />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: dark.text, margin: 0 }}>Projets R&D</h1>
          </div>
          <p style={{ color: dark.sub, fontSize: 13, margin: 0 }}>
            {counts.active} actif{counts.active !== 1 ? "s" : ""} · {counts.all} au total
          </p>
        </div>
        {canCreate && (
          <Link href="/projets/nouveau" style={{ textDecoration: "none" }}>
            <button
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(34,211,238,0.4)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none" }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 18px",
                background: "linear-gradient(135deg,#0ea5e9,#22d3ee)", border: "none",
                borderRadius: 8, color: "#000", fontWeight: 600, fontSize: 13, cursor: "pointer",
                transition: "all .2s ease",
              }}
            >
              <Plus size={15} /> Nouveau projet
            </button>
          </Link>
        )}
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Projets actifs",    value: counts.active,               color: "#22d3ee", icon: <Zap size={15} /> },
          { label: "Tâches complétées", value: `${totalDone}/${totalTasks}`, color: "#4ade80", icon: <CheckSquare size={15} /> },
          { label: "Heures logguées",   value: `${Math.round(totalHours)}h`, color: "#818cf8", icon: <Clock size={15} /> },
          { label: "En brouillon",      value: counts.draft,                color: "#fb923c", icon: <TrendingUp size={15} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 10, padding: "14px 16px", boxShadow: dark.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, color }}>
              {icon}
              <span style={{ fontSize: 11, color: dark.sub }}>{label}</span>
            </div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: dark.sub }} />
          <input
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", paddingLeft: 32, paddingRight: 12, height: 36,
              background: dark.input, border: `1px solid ${dark.border}`, borderRadius: 8,
              color: dark.text, fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Status filters */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {btn("ALL",       "Tous",      counts.all,       dark.sub)}
          {btn("ACTIVE",    "Actifs",    counts.active,    "#22d3ee")}
          {btn("DRAFT",     "Brouillon", counts.draft,     "#fb923c")}
          {btn("COMPLETED", "Terminés",  counts.completed, "#4ade80")}
          {btn("ARCHIVED",  "Archivés",  counts.archived,  "#64748b")}
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 4, marginLeft: "auto", background: dark.input, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 3 }}>
          {(["cards", "list"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                background: view === v ? dark.hover : "transparent",
                color: view === v ? dark.text : dark.sub, transition: "all .15s ease",
              }}
            >
              {v === "cards" ? <LayoutGrid size={15} /> : <LayoutList size={15} />}
            </button>
          ))}
        </div>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0", color: dark.sub }}>
          <FolderKanban size={40} style={{ opacity: .3, margin: "0 auto 16px", display: "block" }} />
          <p style={{ margin: "0 0 8px", fontSize: 16, color: dark.muted }}>
            {initial.length === 0 ? "Aucun projet" : "Aucun résultat"}
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            {initial.length === 0
              ? "Créez votre premier projet R&D."
              : "Modifiez vos filtres de recherche."}
          </p>
          {initial.length === 0 && canCreate && (
            <Link href="/projets/nouveau" style={{ textDecoration: "none" }}>
              <button style={{
                marginTop: 20, padding: "9px 20px",
                background: "linear-gradient(135deg,#0ea5e9,#22d3ee)",
                border: "none", borderRadius: 8, color: "#000", fontWeight: 600,
                fontSize: 13, cursor: "pointer",
              }}>
                <Plus size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Créer un projet
              </button>
            </Link>
          )}
        </div>
      )}

      {/* Cards view */}
      {filtered.length > 0 && view === "cards" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {filtered.map(p => <ProjectCard key={p.id} dark={dark} p={p} />)}
        </div>
      )}

      {/* List view */}
      {filtered.length > 0 && view === "list" && (
        <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 12, overflow: "hidden", boxShadow: dark.shadow }}>
          {/* Header row */}
          <div style={{
            display: "grid", gridTemplateColumns: "3px 1fr 120px 80px 70px 80px 60px 20px",
            gap: 16, padding: "8px 16px",
            borderBottom: `1px solid ${dark.border}`, color: dark.sub, fontSize: 11,
          }}>
            <div />
            <span>Projet</span>
            <span>ARC</span>
            <span>Avancement</span>
            <span style={{ textAlign: "center" }}>Équipe</span>
            <span>Heures</span>
            <span>TRL</span>
            <span />
          </div>
          {filtered.map(p => <ProjectRow key={p.id} dark={dark} p={p} />)}
        </div>
      )}
    </div>
  )
}
