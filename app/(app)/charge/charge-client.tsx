"use client"
import { useThemeColors } from "@/hooks/use-theme-colors"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users, Clock, Target, ChevronDown, ChevronRight,
  Edit3, Check, X, Plus, Trash2, AlertTriangle,
  CheckCircle, TrendingUp, Zap, Settings, Calendar,
  BarChart3, ClipboardList, User,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────
type Task = {
  id: string; title: string; status: string; estimatedHours?: number | null
  dueDate?: string | null; priority: string
  project: { id: string; name: string; code: string }
}
type TimeEntry = {
  id: string; date: string; hours: number; description: string; category: string
  project: { id: string; name: string; code: string }
  task?: { id: string; title: string } | null
}
type Member = {
  id: string; name: string; email: string; role: string
  hourlyRate?: number | null; weeklyCapacity?: number | null
  assignedTasks: Task[]
  timeEntries: TimeEntry[]
}
type Project = { id: string; name: string; code: string; tasks: { id: string; title: string }[] }

interface Props {
  members: Member[]; projects: Project[]
  currentUserId: string; canManage: boolean
  weekStart: string; weekEnd: string
}

// ── Config ─────────────────────────────────────────────────────────────────────
const CATS = {
  RD_DIRECT:    { label: "R&D directe",    color: "#10b981" },
  RD_SUPPORT:   { label: "Support R&D",    color: "#3b82f6" },
  NON_ELIGIBLE: { label: "Non admissible", color: "#64748b" },
}
const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#ef4444", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#64748b",
}
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  TODO: { label: "À faire", color: "#64748b" }, IN_PROGRESS: { label: "En cours", color: "#f97316" },
}
const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin", PROJECT_MANAGER: "Chef de projet", MEMBER: "Membre", VIEWER: "Observateur",
}


// ── Helpers ────────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

function weekHours(entries: TimeEntry[], weekStart: string, weekEnd: string) {
  const s = new Date(weekStart), e = new Date(weekEnd)
  return entries.filter(en => {
    const d = new Date(en.date)
    return d >= s && d <= e
  }).reduce((sum, en) => sum + en.hours, 0)
}

function loadColor(pct: number) {
  if (pct < 70)  return "#10b981"
  if (pct < 90)  return "#f59e0b"
  return "#ef4444"
}

// ── Barre de charge ────────────────────────────────────────────────────────────
function LoadBar({ value, max, color }: { value: number; max: number; color: string }) {
  const dark = useThemeColors()
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 7, borderRadius: 4, background: dark.hover, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.6s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>{pct}%</span>
    </div>
  )
}

// ── Éditeur inline de capacité ────────────────────────────────────────────────
function CapacityEditor({ memberId, value, canEdit, onChange }: {
  memberId: string; value: number; canEdit: boolean; onChange: (v: number) => void
}) {
  const dark = useThemeColors()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(String(value))
  const [saving, setSaving]   = useState(false)

  async function save() {
    const n = parseFloat(draft)
    if (isNaN(n) || n <= 0) { setEditing(false); setDraft(String(value)); return }
    setSaving(true)
    await fetch(`/api/equipe/${memberId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklyCapacity: n }),
    })
    onChange(n); setSaving(false); setEditing(false)
  }

  if (!canEdit) return (
    <span style={{ fontSize: 12, color: dark.sub, display: "flex", alignItems: "center", gap: 4 }}>
      <Clock size={11} /> {value}h/sem
    </span>
  )

  return editing ? (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input type="number" value={draft} onChange={e => setDraft(e.target.value)} min="1" max="80" step="0.5"
        style={{ width: 56, padding: "2px 6px", borderRadius: 5, background: dark.hover, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12, outline: "none" }}
        autoFocus onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setDraft(String(value)) } }} />
      <span style={{ fontSize: 11, color: dark.sub }}>h/sem</span>
      <button onClick={save} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: "#10b981", padding: 2 }}><Check size={13} /></button>
      <button onClick={() => { setEditing(false); setDraft(String(value)) }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2 }}><X size={13} /></button>
    </div>
  ) : (
    <button onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: dark.sub, fontSize: 12, padding: "2px 6px", borderRadius: 5, transition: "all 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.background = dark.hover; e.currentTarget.style.color = dark.text }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = dark.sub }}>
      <Clock size={11} /> {value}h/sem <Edit3 size={10} style={{ opacity: 0.6 }} />
    </button>
  )
}

// ── Dialog saisie heure pour un membre (admin) ────────────────────────────────
function AddEntryDialog({ member, projects, onClose, onCreated }: {
  member: Member; projects: Project[]
  onClose: () => void; onCreated: (e: TimeEntry) => void
}) {
  const dark = useThemeColors()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ projectId: "", taskId: "none", date: today, hours: "", description: "", category: "RD_DIRECT" })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const proj = projects.find(p => p.id === form.projectId)

  async function submit() {
    if (!form.projectId || !form.hours || !form.description) { setError("Projet, heures et description requis."); return }
    setSaving(true); setError("")
    // POST via API mais avec userId du membre (on passera par /api/temps avec userId override)
    const res = await fetch("/api/temps", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, taskId: form.taskId === "none" ? null : form.taskId, userId: member.id }),
    })
    if (res.ok) { const data = await res.json(); onCreated(data); onClose() }
    else { const d = await res.json().catch(() => ({})); setError(d?.error ?? "Erreur") }
    setSaving(false)
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: dark.panel, border: `1px solid ${dark.border}`, borderRadius: 14, padding: 24, width: "100%", maxWidth: 480 }}>
        <p style={{ color: dark.text, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Ajouter des heures — {member.name}</p>
        <p style={{ color: dark.sub, fontSize: 12, marginBottom: 18 }}>Saisie manuelle par le chef de projet</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Projet *</label>
            <Select value={form.projectId} onValueChange={v => set("projectId", v)}>
              <SelectTrigger style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12 }}>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>[{p.code}] {p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {proj && proj.tasks.length > 0 && (
            <div>
              <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Tâche</label>
              <Select value={form.taskId} onValueChange={v => set("taskId", v)}>
                <SelectTrigger style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12 }}>
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune tâche</SelectItem>
                  {proj.tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Date</label>
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                style={{ width: "100%", padding: "7px 8px", borderRadius: 7, background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Heures *</label>
              <input type="number" step="0.25" min="0.25" max="24" value={form.hours} onChange={e => set("hours", e.target.value)} placeholder="ex: 3.5"
                style={{ width: "100%", padding: "7px 8px", borderRadius: 7, background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12, outline: "none" }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Catégorie RS&DE</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}
              style={{ width: "100%", padding: "7px 8px", borderRadius: 7, background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12, outline: "none", cursor: "pointer" }}>
              {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase" }}>Description *</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} placeholder="Travaux effectués…"
              style={{ width: "100%", padding: "7px 8px", borderRadius: 7, background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12, resize: "vertical", outline: "none", fontFamily: "inherit" }} />
          </div>
          {error && <p style={{ color: "#fca5a5", fontSize: 12, padding: "6px 10px", background: "rgba(239,68,68,0.1)", borderRadius: 6 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 7, background: dark.input, border: `1px solid ${dark.border}`, color: dark.sub, fontSize: 12, cursor: "pointer" }}>Annuler</button>
            <button onClick={submit} disabled={saving} style={{ padding: "8px 16px", borderRadius: 7, background: "linear-gradient(135deg,#10b981,#059669)", border: "none", color: dark.text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {saving ? "…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Carte membre ───────────────────────────────────────────────────────────────
function MemberCard({ member: init, projects, canManage, currentUserId, weekStart, weekEnd }: {
  member: Member; projects: Project[]
  canManage: boolean; currentUserId: string
  weekStart: string; weekEnd: string
}) {
  const dark = useThemeColors()
  const [member, setMember]   = useState<Member>(init)
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab]         = useState<"tasks" | "hours">("tasks")
  const [showAdd, setShowAdd] = useState(false)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [entryDraft, setEntryDraft]     = useState({ hours: "", description: "", category: "" })

  const cap = member.weeklyCapacity ?? 40
  const thisWeekH  = weekHours(member.timeEntries, weekStart, weekEnd)
  const backlogH   = member.assignedTasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0)
  const weeksLoad  = cap > 0 ? Math.round((backlogH / cap) * 10) / 10 : 0
  const loadPct    = cap > 0 ? Math.round(thisWeekH / cap * 100) : 0
  const color      = loadColor(loadPct)
  const available  = Math.max(0, cap - thisWeekH)
  const isMe       = member.id === currentUserId

  const status = loadPct >= 90 ? { label: "Surchargé", color: "#ef4444", icon: <AlertTriangle size={12}/> }
    : loadPct >= 70 ? { label: "Occupé", color: "#f59e0b", icon: <Zap size={12}/> }
    : { label: "Disponible", color: "#10b981", icon: <CheckCircle size={12}/> }

  function updateCap(v: number) {
    setMember(m => ({ ...m, weeklyCapacity: v }))
  }

  async function deleteEntry(entryId: string) {
    await fetch(`/api/temps/${entryId}`, { method: "DELETE" })
    setMember(m => ({ ...m, timeEntries: m.timeEntries.filter(e => e.id !== entryId) }))
  }

  async function saveEntry(entryId: string) {
    const res = await fetch(`/api/temps/${entryId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(entryDraft.hours ? { hours: entryDraft.hours } : {}),
        ...(entryDraft.description ? { description: entryDraft.description } : {}),
        ...(entryDraft.category ? { category: entryDraft.category } : {}),
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMember(m => ({ ...m, timeEntries: m.timeEntries.map(e => e.id === entryId ? { ...e, ...updated } : e) }))
    }
    setEditingEntry(null)
  }

  function handleCreated(entry: TimeEntry) {
    setMember(m => ({ ...m, timeEntries: [entry, ...m.timeEntries] }))
  }

  const ini = initials(member.name)

  return (
    <div style={{
      background: dark.card, border: `1px solid ${dark.border}`,
      borderRadius: 14, overflow: "hidden", transition: "all 0.2s",
    }}>
      {/* Barre top couleur */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}44)` }} />

      {/* Header membre */}
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: "50%", background: `${color}22`,
            border: `2px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, fontSize: 14, fontWeight: 800, color: color,
          }}>{ini}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: dark.text }}>{member.name}</span>
              {isMe && <span style={{ fontSize: 10, color: dark.sub }}>(vous)</span>}
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: dark.hover, color: dark.sub }}>{ROLE_LABELS[member.role]}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: `${status.color}22`, border: `1px solid ${status.color}44`, color: status.color, marginLeft: "auto" }}>
                {status.icon} {status.label}
              </span>
            </div>
            <p style={{ fontSize: 11, color: dark.sub, margin: 0 }}>{member.email}</p>
          </div>
        </div>

        {/* Stats de charge */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
          {[
            { label: "Cette semaine", value: `${thisWeekH.toFixed(1)}h`, color: color },
            { label: "Capacité / sem", value: <CapacityEditor memberId={member.id} value={cap} canEdit={canManage} onChange={updateCap} />, color: dark.sub },
            { label: "Disponible", value: `${available.toFixed(1)}h`, color: available > 0 ? "#10b981" : "#ef4444" },
            { label: "Backlog tâches", value: `${backlogH.toFixed(1)}h`, color: backlogH > cap * 2 ? "#ef4444" : "#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: "8px 10px" }}>
              <p style={{ fontSize: 9, color: dark.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</p>
              {typeof s.value === "string"
                ? <p style={{ fontSize: 14, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                : <div>{s.value}</div>
              }
            </div>
          ))}
        </div>

        {/* Barre charge semaine */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: dark.sub, fontWeight: 600 }}>Charge semaine en cours</span>
            <span style={{ fontSize: 10, color: dark.sub }}>{thisWeekH.toFixed(1)}h / {cap}h</span>
          </div>
          <LoadBar value={thisWeekH} max={cap} color={color} />
        </div>

        {/* Backlog en semaines */}
        {backlogH > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 7, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", marginTop: 8 }}>
            <ClipboardList size={12} color="#f59e0b" />
            <span style={{ fontSize: 11, color: "#fbbf24" }}>
              {member.assignedTasks.length} tâche{member.assignedTasks.length > 1 ? "s" : ""} actives · {backlogH.toFixed(1)}h estimées
              {cap > 0 && ` · ≈ ${weeksLoad} sem. de travail`}
            </span>
          </div>
        )}
        {backlogH === 0 && member.assignedTasks.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 7, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <CheckCircle size={12} color="#10b981" />
            <span style={{ fontSize: 11, color: "#10b981" }}>Aucune tâche active — peut prendre de nouvelles tâches</span>
          </div>
        )}

        {/* Toggle détail */}
        <button onClick={() => setExpanded(v => !v)} style={{
          display: "flex", alignItems: "center", gap: 5, marginTop: 12,
          background: "none", border: "none", cursor: "pointer", color: dark.sub, fontSize: 11, padding: 0, transition: "color 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.color = "white"}
          onMouseLeave={e => e.currentTarget.style.color = dark.sub}>
          {expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
          {expanded ? "Masquer le détail" : "Voir tâches & heures"}
        </button>
      </div>

      {/* Détail expandable */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${dark.border}`, padding: "16px 20px" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14, background: dark.card, borderRadius: 8, padding: 3 }}>
            {([["tasks", ClipboardList, "Tâches actives"], ["hours", Clock, "Heures"]] as const).map(([v, Icon, label]) => (
              <button key={v} onClick={() => setTab(v as "tasks" | "hours")}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                  background: tab === v ? dark.hover : "transparent",
                  border: tab === v ? `1px solid ${dark.border}` : "1px solid transparent",
                  color: tab === v ? dark.text : dark.sub, transition: "all 0.15s",
                }}>
                <Icon size={12} /> {label}
                {v === "tasks" && <span style={{ padding: "0 6px", borderRadius: 10, background: dark.hover, fontSize: 10, color: dark.sub }}>{member.assignedTasks.length}</span>}
              </button>
            ))}
            {canManage && (
              <button onClick={() => setShowAdd(true)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981", transition: "all 0.15s" }}>
                <Plus size={12} /> Ajouter heures
              </button>
            )}
          </div>

          {/* Tab Tâches */}
          {tab === "tasks" && (
            member.assignedTasks.length === 0 ? (
              <p style={{ textAlign: "center", color: dark.sub, fontSize: 12, padding: "16px 0" }}>Aucune tâche active.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {member.assignedTasks.map(task => {
                  const p = PRIORITY_COLORS[task.priority] ?? "#64748b"
                  const s = STATUS_CFG[task.status] ?? STATUS_CFG.TODO
                  return (
                    <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: dark.card, border: `1px solid ${dark.border}`, transition: "all 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = dark.hover}
                      onMouseLeave={e => e.currentTarget.style.background = dark.hover}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: p, flexShrink: 0 }} title={task.priority} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: dark.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</p>
                        <p style={{ fontSize: 10, color: dark.sub, margin: 0 }}>{task.project.code} · {task.project.name}</p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: `${s.color}22`, color: s.color, flexShrink: 0 }}>{s.label}</span>
                      {task.estimatedHours ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock size={10} />{task.estimatedHours}h
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: dark.muted, flexShrink: 0 }}>— h</span>
                      )}
                      {task.dueDate && (
                        <span style={{ fontSize: 10, color: new Date(task.dueDate) < new Date() ? "#ef4444" : dark.sub, flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
                          <Calendar size={10} />{new Date(task.dueDate).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* Tab Heures */}
          {tab === "hours" && (
            member.timeEntries.length === 0 ? (
              <p style={{ textAlign: "center", color: dark.sub, fontSize: 12, padding: "16px 0" }}>Aucune entrée de temps.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 360, overflowY: "auto" }}>
                {member.timeEntries.slice(0, 50).map(entry => {
                  const cat = CATS[entry.category as keyof typeof CATS] ?? CATS.NON_ELIGIBLE
                  const isEditing = editingEntry === entry.id

                  return (
                    <div key={entry.id} style={{ padding: "8px 12px", borderRadius: 8, background: dark.card, border: `1px solid ${dark.border}` }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <input type="number" step="0.25" defaultValue={entry.hours} onChange={e => setEntryDraft(d => ({ ...d, hours: e.target.value }))}
                            style={{ width: 56, padding: "4px 6px", borderRadius: 5, background: dark.hover, border: "1px solid rgba(255,255,255,0.2)", color: dark.text, fontSize: 12, outline: "none" }} />
                          <span style={{ fontSize: 11, color: dark.sub }}>h</span>
                          <select defaultValue={entry.category} onChange={e => setEntryDraft(d => ({ ...d, category: e.target.value }))}
                            style={{ padding: "4px 6px", borderRadius: 5, background: dark.hover, border: "1px solid rgba(255,255,255,0.2)", color: dark.text, fontSize: 11, outline: "none", cursor: "pointer" }}>
                            {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                          <input defaultValue={entry.description} onChange={e => setEntryDraft(d => ({ ...d, description: e.target.value }))}
                            style={{ flex: 1, minWidth: 120, padding: "4px 6px", borderRadius: 5, background: dark.hover, border: "1px solid rgba(255,255,255,0.2)", color: dark.text, fontSize: 11, outline: "none" }} />
                          <button onClick={() => saveEntry(entry.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#10b981" }}><Check size={14}/></button>
                          <button onClick={() => setEditingEntry(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><X size={14}/></button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, color: dark.sub, flexShrink: 0 }}>{new Date(entry.date).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 5, background: `${cat.color}22`, color: cat.color, flexShrink: 0 }}>{cat.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: dark.text, flexShrink: 0 }}>{entry.hours}h</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "#818cf8", flexShrink: 0 }}>{entry.project.code}</span>
                          <span style={{ fontSize: 11, color: dark.sub, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.description}</span>
                          {canManage && (
                            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                              <button onClick={() => { setEditingEntry(entry.id); setEntryDraft({ hours: String(entry.hours), description: entry.description, category: entry.category }) }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: dark.sub, padding: 2, transition: "color 0.15s" }}
                                onMouseEnter={e => e.currentTarget.style.color = "white"}
                                onMouseLeave={e => e.currentTarget.style.color = dark.sub}>
                                <Edit3 size={12}/>
                              </button>
                              <button onClick={() => deleteEntry(entry.id)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: dark.sub, padding: 2, transition: "color 0.15s" }}
                                onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                                onMouseLeave={e => e.currentTarget.style.color = dark.sub}>
                                <Trash2 size={12}/>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}

      {showAdd && (
        <AddEntryDialog member={member} projects={projects} onClose={() => setShowAdd(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────
export function ChargeClient({ members: init, projects, currentUserId, canManage, weekStart, weekEnd }: Props) {
  const dark = useThemeColors()
  const [members] = useState<Member[]>(init)
  const [filter, setFilter] = useState<"all" | "overloaded" | "available">("all")

  const ws = new Date(weekStart), we = new Date(weekEnd)
  const totalCap  = members.reduce((s, m) => s + (m.weeklyCapacity ?? 40), 0)
  const totalLogH = members.reduce((s, m) => s + weekHours(m.timeEntries, weekStart, weekEnd), 0)
  const totalBack = members.reduce((s, m) => s + m.assignedTasks.reduce((ss, t) => ss + (t.estimatedHours ?? 0), 0), 0)
  const overloaded = members.filter(m => { const c = m.weeklyCapacity ?? 40; return weekHours(m.timeEntries, weekStart, weekEnd) / c >= 0.9 }).length
  const available  = members.filter(m => { const c = m.weeklyCapacity ?? 40; return weekHours(m.timeEntries, weekStart, weekEnd) / c < 0.7 }).length

  const visible = members.filter(m => {
    const h = weekHours(m.timeEntries, weekStart, weekEnd)
    const c = m.weeklyCapacity ?? 40
    const pct = c > 0 ? h / c : 0
    if (filter === "overloaded") return pct >= 0.9
    if (filter === "available")  return pct < 0.7
    return true
  })

  const weekLabel = `${ws.toLocaleDateString("fr-CA", { day: "numeric", month: "short" })} — ${we.toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}`

  return (
    <div style={{ minHeight: "100vh", background: dark.bg, paddingBottom: 60 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: dark.panel, borderBottom: "1px solid rgba(59,130,246,0.2)", padding: "28px 32px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(59,130,246,0.12)", border: "2px solid rgba(59,130,246,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 18px rgba(59,130,246,0.2)" }}>
              <BarChart3 size={20} color="#3b82f6" />
            </div>
            <div>
              <h1 style={{ color: dark.text, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>Charge de travail</h1>
              <p style={{ fontSize: 13, color: dark.sub, margin: 0, marginTop: 2 }}>Semaine du {weekLabel} · {members.length} membres</p>
            </div>
          </div>

          {/* Stats équipe */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "Capacité équipe", value: `${totalCap}h/sem`, color: "#3b82f6", icon: <Target size={13}/> },
              { label: "Heures cette semaine", value: `${totalLogH.toFixed(1)}h`, color: "#10b981", icon: <Clock size={13}/> },
              { label: "Backlog estimé", value: `${totalBack.toFixed(1)}h`, color: "#f59e0b", icon: <ClipboardList size={13}/> },
              { label: "Surchargés", value: overloaded, color: overloaded > 0 ? "#ef4444" : "#64748b", icon: <AlertTriangle size={13}/> },
              { label: "Disponibles", value: available, color: "#10b981", icon: <CheckCircle size={13}/> },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: dark.card, border: `1px solid ${dark.border}` }}>
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
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: dark.sub, fontWeight: 600 }}>Filtrer :</span>
          {([
            ["all", "Tous", members.length],
            ["overloaded", "Surchargés", overloaded],
            ["available", "Disponibles", available],
          ] as const).map(([v, label, count]) => (
            <button key={v} onClick={() => setFilter(v as any)}
              style={{
                padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
                background: filter === v ? "rgba(59,130,246,0.15)" : dark.hover,
                border: filter === v ? "1px solid rgba(59,130,246,0.35)" : `1px solid ${dark.border}`,
                color: filter === v ? "#60a5fa" : dark.sub, transition: "all 0.15s",
              }}>
              {label}
              <span style={{ padding: "0 6px", borderRadius: 10, background: dark.hover, fontSize: 10, color: dark.sub }}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Cartes membres ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
        {visible.map(member => (
          <MemberCard
            key={member.id}
            member={member}
            projects={projects}
            canManage={canManage}
            currentUserId={currentUserId}
            weekStart={weekStart}
            weekEnd={weekEnd}
          />
        ))}
      </div>
    </div>
  )
}
