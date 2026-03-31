"use client"
import { useThemeColors } from "@/hooks/use-theme-colors"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckSquare, Clock, AlertTriangle, XCircle, CheckCircle,
  Filter, Search, ChevronRight, CalendarDays, User, Plus,
  FlaskConical, LayoutList, Columns3, ChevronDown, Zap,
  Circle, Loader, Eye, Ban, Check,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────
type DC = ReturnType<typeof useThemeColors>

type Task = {
  id: string; title: string; description: string | null
  status: string; priority: string; arcType: string; isRDEligible: boolean
  dueDate: string | null; estimatedHours: number | null; completedAt: string | null
  project: { id: string; name: string; code: string }
  assignee: { id: string; name: string } | null
  children: { id: string; status: string }[]
}
type Project = { id: string; name: string; code: string }
type Member  = { id: string; name: string }

interface Props {
  tasks: Task[]; projects: Project[]; members: Member[]
  currentUserId: string; currentUserRole: string
}

// ── Config ─────────────────────────────────────────────────────────────────────
function getStatusCfg(dark: DC): Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> {
  return {
    TODO:        { label: "À faire",      color: dark.sub,   bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)",  icon: Circle },
    IN_PROGRESS: { label: "En cours",     color: "#3b82f6",  bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.25)",  icon: Loader },
    IN_REVIEW:   { label: "En révision",  color: "#8b5cf6",  bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.25)",  icon: Eye },
    BLOCKED:     { label: "Bloquée",      color: "#ef4444",  bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)",   icon: Ban },
    DONE:        { label: "Terminée",     color: "#10b981",  bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)",  icon: Check },
    ABANDONED:   { label: "Abandonnée",   color: dark.muted, bg: "rgba(71,85,105,0.06)",   border: "rgba(71,85,105,0.15)",   icon: XCircle },
  }
}
const STATUS_ORDER = ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "ABANDONED"]

function getPriorityCfg(dark: DC): Record<string, { label: string; color: string; dot: string }> {
  return {
    LOW:      { label: "Basse",    color: dark.sub,  dot: "#64748b" },
    MEDIUM:   { label: "Moyenne",  color: "#3b82f6", dot: "#3b82f6" },
    HIGH:     { label: "Haute",    color: "#f97316", dot: "#f97316" },
    CRITICAL: { label: "Critique", color: "#ef4444", dot: "#ef4444" },
  }
}



// ── Task card (dark) ───────────────────────────────────────────────────────────
function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (id: string, s: string) => void }) {
  const dark = useThemeColors()
  const STATUS_CFG = getStatusCfg(dark)
  const PRIORITY_CFG = getPriorityCfg(dark)
  const cfg   = STATUS_CFG[task.status] ?? STATUS_CFG.TODO
  const pCfg  = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.MEDIUM
  const done  = task.children.filter(c => c.status === "DONE").length
  const total = task.children.length
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "ABANDONED"
  const StatusIcon = cfg.icon

  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 10, overflow: "hidden", transition: "all 0.18s", marginBottom: 7,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 20px ${cfg.color}18`; e.currentTarget.style.borderColor = cfg.color }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = cfg.border }}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}33)` }} />
      <div style={{ padding: "10px 12px" }}>
        {/* Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
          <Link href={`/projets/${task.project.id}`} style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
            color: "#818cf8", textDecoration: "none", transition: "background 0.15s",
          }}>
            {task.project.code}
          </Link>
          {task.isRDEligible && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(16,185,129,0.15)", color: "#10b981" }}>RS&DE</span>
          )}
          {/* Priority dot */}
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: pCfg.dot, marginLeft: 2, boxShadow: `0 0 5px ${pCfg.dot}` }} title={pCfg.label} />
        </div>

        {/* Title */}
        <p style={{ fontSize: 13, fontWeight: 600, color: task.status === "DONE" ? dark.sub : dark.text, margin: "0 0 6px", lineHeight: 1.4, textDecoration: task.status === "DONE" ? "line-through" : "none" }}>
          {task.title}
        </p>

        {/* Meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {task.assignee && (
            <span style={{ fontSize: 10, color: dark.sub, display: "flex", alignItems: "center", gap: 3 }}>
              <User size={10} /> {task.assignee.name.split(" ")[0]}
            </span>
          )}
          {task.dueDate && (
            <span style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 3, color: overdue ? "#ef4444" : dark.sub, fontWeight: overdue ? 700 : 400 }}>
              <CalendarDays size={10} />
              {new Date(task.dueDate).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
              {overdue && " ⚠"}
            </span>
          )}
          {task.estimatedHours && (
            <span style={{ fontSize: 10, color: dark.sub, display: "flex", alignItems: "center", gap: 3 }}>
              <Clock size={10} /> {task.estimatedHours}h
            </span>
          )}
          {total > 0 && (
            <span style={{ fontSize: 10, color: done === total ? "#10b981" : dark.sub }}>
              {done}/{total} sous-tâches
            </span>
          )}

          {/* Quick status change */}
          <div style={{ marginLeft: "auto" }}>
            <Select value={task.status} onValueChange={v => onStatusChange(task.id, v)}>
              <SelectTrigger style={{ height: 22, padding: "0 6px", background: dark.input, border: `1px solid ${dark.border}`, borderRadius: 5, fontSize: 10, color: cfg.color, gap: 3, minWidth: 0 }}>
                <StatusIcon size={10} /> <span style={{ fontSize: 9 }}>{cfg.label}</span>
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map(s => {
                  const sc = STATUS_CFG[s]
                  const SI = sc.icon
                  return <SelectItem key={s} value={s}><span style={{ display: "flex", alignItems: "center", gap: 6, color: sc.color }}><SI size={11}/> {sc.label}</span></SelectItem>
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Dialog nouvelle tâche ──────────────────────────────────────────────────────
function NewTaskDialog({ open, onClose, projects, members, onCreated }: {
  open: boolean; onClose: () => void
  projects: Project[]; members: Member[]
  onCreated: (t: Task) => void
}) {
  const dark = useThemeColors()
  const PRIORITY_CFG = getPriorityCfg(dark)
  const [form, setForm] = useState({
    projectId: "", title: "", description: "", priority: "MEDIUM",
    assigneeId: "", dueDate: "", estimatedHours: "", isRDEligible: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  function handleClose() {
    setForm({ projectId: "", title: "", description: "", priority: "MEDIUM", assigneeId: "", dueDate: "", estimatedHours: "", isRDEligible: true })
    setError(""); onClose()
  }

  async function submit() {
    if (!form.projectId || !form.title) { setError("Projet et titre requis."); return }
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/projets/${form.projectId}/taches`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title, description: form.description || null,
          priority: form.priority,
          assigneeId: form.assigneeId || null,
          dueDate: form.dueDate || null,
          estimatedHours: form.estimatedHours || null,
          isRDEligible: form.isRDEligible,
        }),
      })
      if (res.ok) {
        // Re-fetch full task with project/assignee/children
        const raw = await res.json()
        const proj = projects.find(p => p.id === form.projectId)
        const assignee = members.find(m => m.id === form.assigneeId) ?? null
        const full: Task = { ...raw, project: proj ?? { id: form.projectId, name: "", code: "" }, assignee, children: [] }
        onCreated(full); handleClose()
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d?.error ?? `Erreur ${res.status}`)
      }
    } catch { setError("Erreur réseau") }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: dark.panel, border: `1px solid ${dark.border}`, borderRadius: 14, padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
        <p style={{ color: dark.text, fontSize: 16, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(99,102,241,0.15)", border: "2px solid rgba(99,102,241,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={12} color="#818cf8" />
          </div>
          Nouvelle tâche
        </p>
        <p style={{ color: dark.sub, fontSize: 12, marginBottom: 18 }}>Ajoutez une tâche à un projet actif</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Projet */}
          <div>
            <label style={{ fontSize: 10, color: "#818cf8", fontWeight: 700, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Projet *</label>
            <Select value={form.projectId} onValueChange={v => set("projectId", v)}>
              <SelectTrigger style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12 }}>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>[{p.code}] {p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Titre */}
          <div>
            <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Titre *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Titre de la tâche…"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 7, background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 13, outline: "none" }} />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} placeholder="Optionnel…"
              style={{ width: "100%", padding: "7px 10px", borderRadius: 7, background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12, resize: "vertical", outline: "none", fontFamily: "inherit" }} />
          </div>

          {/* Priorité + Assigné */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Priorité</label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CFG).map(([k, v]) => (
                    <SelectItem key={k} value={k}><span style={{ color: v.dot }}>{v.label}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Assigné</label>
              <Select value={form.assigneeId || "none"} onValueChange={v => set("assigneeId", v === "none" ? "" : v)}>
                <SelectTrigger style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12 }}>
                  <SelectValue placeholder="Personne" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date + Heures */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Échéance</label>
              <input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)}
                style={{ width: "100%", padding: "7px 8px", borderRadius: 7, background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Heures estimées</label>
              <input type="number" step="0.5" min="0" value={form.estimatedHours} onChange={e => set("estimatedHours", e.target.value)} placeholder="ex: 4"
                style={{ width: "100%", padding: "7px 8px", borderRadius: 7, background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12, outline: "none" }} />
            </div>
          </div>

          {/* RS&DE */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => set("isRDEligible", !form.isRDEligible)} style={{
              width: 38, height: 20, borderRadius: 10, transition: "background 0.2s", cursor: "pointer",
              background: form.isRDEligible ? "#10b981" : dark.border,
              border: "none", padding: 2, display: "flex", alignItems: "center",
              justifyContent: form.isRDEligible ? "flex-end" : "flex-start",
            }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white" }} />
            </button>
            <span style={{ fontSize: 12, color: form.isRDEligible ? "#10b981" : dark.sub, fontWeight: 600 }}>
              {form.isRDEligible ? "Admissible RS&DE" : "Non admissible RS&DE"}
            </span>
          </div>

          {error && <p style={{ color: "#fca5a5", fontSize: 12, padding: "6px 10px", background: "rgba(239,68,68,0.1)", borderRadius: 6 }}>{error}</p>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={handleClose} style={{ padding: "9px 16px", borderRadius: 8, background: dark.input, border: `1px solid ${dark.border}`, color: dark.sub, fontSize: 13, cursor: "pointer" }}>Annuler</button>
            <button onClick={submit} disabled={saving || !form.projectId || !form.title}
              style={{ padding: "9px 18px", borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: dark.text, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving || !form.projectId || !form.title ? 0.6 : 1, transition: "all 0.15s" }}
              onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(99,102,241,0.4)" } }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}>
              {saving ? "Création…" : "Créer la tâche"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Vue groupée (par statut, collapsible) ─────────────────────────────────────
function GroupedView({ byStatus, onStatusChange }: { byStatus: Record<string, Task[]>; onStatusChange: (id: string, s: string) => void }) {
  const dark = useThemeColors()
  const STATUS_CFG = getStatusCfg(dark)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggle = (s: string) => setCollapsed(p => ({ ...p, [s]: !p[s] }))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {STATUS_ORDER.map(status => {
        const tasks = byStatus[status] ?? []
        const cfg   = STATUS_CFG[status]
        const isCollapsed = collapsed[status]
        if (tasks.length === 0) return null
        return (
          <div key={status}>
            <button onClick={() => toggle(status)} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "8px 12px", borderRadius: 8, marginBottom: 8,
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              cursor: "pointer", transition: "all 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = `${cfg.color}15`}
              onMouseLeave={e => e.currentTarget.style.background = cfg.bg}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
              <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 20, background: dark.hover, color: dark.sub, fontWeight: 700 }}>{tasks.length}</span>
              <div style={{ marginLeft: "auto", color: dark.sub }}>
                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              </div>
            </button>
            {!isCollapsed && (
              <div style={{ paddingLeft: 4 }}>
                {tasks.map(t => <TaskCard key={t.id} task={t} onStatusChange={onStatusChange} />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Vue kanban ─────────────────────────────────────────────────────────────────
function KanbanView({ byStatus, onStatusChange }: { byStatus: Record<string, Task[]>; onStatusChange: (id: string, s: string) => void }) {
  const dark = useThemeColors()
  const STATUS_CFG = getStatusCfg(dark)
  return (
    <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
      {STATUS_ORDER.map(status => {
        const tasks = byStatus[status] ?? []
        const cfg   = STATUS_CFG[status]
        return (
          <div key={status} style={{ minWidth: 230, width: 250, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, padding: "7px 10px", borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, boxShadow: `0 0 5px ${cfg.color}` }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: dark.hover, color: cfg.color }}>{tasks.length}</span>
            </div>
            {tasks.length === 0
              ? <div style={{ padding: "16px 0", textAlign: "center", border: `1px dashed ${cfg.border}`, borderRadius: 8, color: dark.sub, fontSize: 11 }}>Aucune</div>
              : tasks.map(t => <TaskCard key={t.id} task={t} onStatusChange={onStatusChange} />)
            }
          </div>
        )
      })}
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────
export function TachesClient({ tasks: initTasks, projects, members, currentUserId, currentUserRole }: Props) {
  const dark = useThemeColors()
  const STATUS_CFG = getStatusCfg(dark)
  const PRIORITY_CFG = getPriorityCfg(dark)
  const [tasks, setTasks]   = useState<Task[]>(initTasks)
  const [showNew, setShowNew] = useState(false)
  const [view, setView]     = useState<"grouped" | "kanban">("kanban")

  const [filterProject,  setFP] = useState("all")
  const [filterStatus,   setFS] = useState("all")
  const [filterPriority, setFPr] = useState("all")
  const [filterAssignee, setFA] = useState("all")
  const [filterRD,       setFRD] = useState(false)
  const [search, setSearch]     = useState("")

  const filtered = useMemo(() => tasks.filter(t => {
    if (filterProject  !== "all" && t.project.id   !== filterProject)  return false
    if (filterStatus   !== "all" && t.status        !== filterStatus)   return false
    if (filterPriority !== "all" && t.priority      !== filterPriority) return false
    if (filterAssignee === "me"  && t.assignee?.id  !== currentUserId)  return false
    if (filterAssignee !== "all" && filterAssignee !== "me" && t.assignee?.id !== filterAssignee) return false
    if (filterRD && !t.isRDEligible) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [tasks, filterProject, filterStatus, filterPriority, filterAssignee, filterRD, search, currentUserId])

  const byStatus = useMemo(() => {
    const map: Record<string, Task[]> = {}
    STATUS_ORDER.forEach(s => { map[s] = [] })
    filtered.forEach(t => { if (map[t.status]) map[t.status].push(t) })
    return map
  }, [filtered])

  const stats = {
    total:      tasks.length,
    inProgress: tasks.filter(t => t.status === "IN_PROGRESS").length,
    blocked:    tasks.filter(t => t.status === "BLOCKED").length,
    overdue:    tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE" && t.status !== "ABANDONED").length,
    done:       tasks.filter(t => t.status === "DONE").length,
  }

  async function handleStatusChange(taskId: string, status: string) {
    const res = await fetch("/api/taches", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTasks(p => p.map(t => t.id === taskId ? { ...t, ...updated } : t))
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: dark.bg, paddingBottom: 60 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: dark.panel, borderBottom: `1px solid ${dark.border}`, padding: "28px 32px 24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(99,102,241,0.12)", border: "2px solid rgba(99,102,241,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 18px rgba(99,102,241,0.2)" }}>
                <CheckSquare size={20} color="#6366f1" />
              </div>
              <div>
                <h1 style={{ color: dark.text, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>Tâches</h1>
                <p style={{ fontSize: 13, color: dark.sub, margin: 0, marginTop: 2 }}>Toutes les tâches RS&DE — tous projets confondus</p>
              </div>
            </div>
            <button onClick={() => setShowNew(true)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, cursor: "pointer",
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              border: "none", color: "#fff",
              fontSize: 13, fontWeight: 700, transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,0.25)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}>
              <Plus size={15} /> Nouvelle tâche
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "Total",        value: stats.total,      color: dark.sub, icon: <CheckSquare size={13}/> },
              { label: "En cours",     value: stats.inProgress, color: "#3b82f6", icon: <Zap size={13}/> },
              { label: "Bloquées",     value: stats.blocked,    color: "#ef4444", icon: <XCircle size={13}/>, alert: stats.blocked > 0 },
              { label: "En retard",    value: stats.overdue,    color: stats.overdue > 0 ? "#f97316" : "#64748b", icon: <AlertTriangle size={13}/>, alert: stats.overdue > 0 },
              { label: "Terminées",    value: stats.done,       color: "#10b981", icon: <CheckCircle size={13}/> },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: (s as any).alert ? `${s.color}18` : dark.card, border: `1px solid ${(s as any).alert ? `${s.color}44` : dark.border}` }}>
                <span style={{ color: s.color }}>{s.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: dark.text }}>{s.value}</span>
                <span style={{ fontSize: 11, color: dark.sub }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div style={{ background: dark.bg, borderBottom: `1px solid ${dark.border}`, padding: "12px 32px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 180px", maxWidth: 260 }}>
            <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: dark.sub }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
              style={{ width: "100%", padding: "6px 10px 6px 28px", borderRadius: 7, background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12, outline: "none" }} />
          </div>

          {/* Projet */}
          <select value={filterProject} onChange={e => setFP(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 7, background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 11, cursor: "pointer", outline: "none" }}>
            <option value="all">Tous les projets</option>
            {projects.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
          </select>

          {/* Statut */}
          <select value={filterStatus} onChange={e => setFS(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 7, background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 11, cursor: "pointer", outline: "none" }}>
            <option value="all">Tous les statuts</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
          </select>

          {/* Priorité */}
          <select value={filterPriority} onChange={e => setFPr(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 7, background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 11, cursor: "pointer", outline: "none" }}>
            <option value="all">Toutes priorités</option>
            {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          {/* Assigné */}
          <select value={filterAssignee} onChange={e => setFA(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 7, background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 11, cursor: "pointer", outline: "none" }}>
            <option value="all">Tous les membres</option>
            <option value="me">Mes tâches</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          {/* RS&DE toggle */}
          <button onClick={() => setFRD(v => !v)} style={{
            padding: "5px 11px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700,
            background: filterRD ? "rgba(16,185,129,0.15)" : dark.card,
            border: filterRD ? "1px solid rgba(16,185,129,0.35)" : `1px solid ${dark.border}`,
            color: filterRD ? "#10b981" : dark.sub, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5,
          }}>
            <FlaskConical size={11} /> RS&DE seulement
          </button>

          {/* Vue toggle */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: dark.card, borderRadius: 8, padding: 3 }}>
            {([["kanban", Columns3, "Kanban"], ["grouped", LayoutList, "Liste"]] as const).map(([v, Icon, label]) => (
              <button key={v} onClick={() => setView(v as "kanban" | "grouped")}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                  background: view === v ? "rgba(99,102,241,0.2)" : "transparent", border: view === v ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent",
                  color: view === v ? "#a5b4fc" : dark.sub, transition: "all 0.15s" }}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contenu ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", border: `1px dashed ${dark.border}`, borderRadius: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(99,102,241,0.1)", border: "2px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <CheckSquare size={22} color="#6366f1" />
            </div>
            <p style={{ color: dark.text, fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Aucune tâche trouvée</p>
            <p style={{ color: dark.sub, fontSize: 13 }}>Ajustez les filtres ou créez une nouvelle tâche.</p>
          </div>
        ) : view === "kanban" ? (
          <KanbanView byStatus={byStatus} onStatusChange={handleStatusChange} />
        ) : (
          <GroupedView byStatus={byStatus} onStatusChange={handleStatusChange} />
        )}
      </div>

      <NewTaskDialog open={showNew} onClose={() => setShowNew(false)} projects={projects} members={members} onCreated={t => setTasks(p => [t, ...p])} />
    </div>
  )
}
