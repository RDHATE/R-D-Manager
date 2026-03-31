"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  Plus, ChevronDown, Calendar, Clock, Target,
  Loader2, ChevronRight, BookOpen, GitBranch,
} from "lucide-react"
import { ExperimentCardModal } from "@/components/sprints/experiment-card-modal"
import { PivotTracker } from "@/components/sprints/pivot-tracker"

// ─── Types ────────────────────────────────────────────────────────────────────
type CardStatus =
  | "HYPOTHESIS"
  | "PROTOCOL_DEFINED"
  | "IN_PROGRESS"
  | "RESULT_OBTAINED"
  | "ANALYSIS"
  | "VALIDATED"
  | "PIVOTED"

type Card = {
  id: string
  title: string
  hypothesisText: string
  status: CardStatus
  resultType?: string | null
  estimatedHours?: number | null
  actualHours?: number | null
  isRDEligible: boolean
  sortOrder: number
  sprintId?: string | null
  assignee?: { id: string; name: string } | null
  pivots: { id: string }[]
  _count: { journalEntries: number }
}

type CardFull = {
  id: string
  title: string
  hypothesisText: string
  method?: string | null
  materials?: string | null
  variables?: string | null
  expectedResult?: string | null
  actualResult?: string | null
  conclusion?: string | null
  resultType?: string | null
  status: string
  estimatedHours?: number | null
  actualHours?: number | null
  isRDEligible: boolean
  assignee?: { id: string; name: string } | null
  sprint?: { id: string; title: string } | null
  hypothesis?: { id: string; title: string } | null
  pivots: any[]
  journalEntries: any[]
  attachments: any[]
}

type Sprint = {
  id: string
  title: string
  goal?: string | null
  status: string
  startDate: string
  endDate: string
  capacity?: number | null
  cards: Card[]
}

interface Props {
  projectId: string
  members: { id: string; name: string }[]
}

// ─── Column config ─────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: "HYPOTHESIS",        label: "Hypothèse",           color: "#8b5cf6", icon: "🔬" },
  { key: "PROTOCOL_DEFINED",  label: "Protocole défini",    color: "#3b82f6", icon: "📋" },
  { key: "IN_PROGRESS",       label: "Expérience en cours", color: "#f97316", icon: "⚗️" },
  { key: "RESULT_OBTAINED",   label: "Résultat obtenu",     color: "#06b6d4", icon: "📊" },
  { key: "ANALYSIS",          label: "Analyse",             color: "#f59e0b", icon: "🔍" },
  { key: "VALIDATED",         label: "Validée ✓",           color: "#10b981", icon: "✅" },
  { key: "PIVOTED",           label: "Pivot ↻",             color: "#ef4444", icon: "↻"  },
]

const STATUS_SPRINT: Record<string, { label: string; color: string; bg: string }> = {
  PLANNING:  { label: "Planification", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  ACTIVE:    { label: "Actif",         color: "#06b6d4", bg: "rgba(6,182,212,0.12)"   },
  COMPLETED: { label: "Terminé",       color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
}

const dark = {
  bg:         "#030c1a",
  card:       "rgba(255,255,255,0.04)",
  cardHover:  "rgba(255,255,255,0.07)",
  border:     "rgba(255,255,255,0.08)",
  headerBg:   "linear-gradient(135deg, #0a0f1e, #0d1527)",
  headerBorder: "rgba(255,255,255,0.06)",
  colBg:      "rgba(255,255,255,0.02)",
  text:       "white",
  sub:        "#64748b",
  inputBg:    "rgba(255,255,255,0.05)",
}

const lightTheme = {
  bg:         "#f1f5f9",
  card:       "#ffffff",
  cardHover:  "#f8fafc",
  border:     "#e2e8f0",
  headerBg:   "#ffffff",
  headerBorder: "#e2e8f0",
  colBg:      "#f8fafc",
  text:       "#0f172a",
  sub:        "#64748b",
  inputBg:    "#f8fafc",
}

// ─── Initials avatar ───────────────────────────────────────────────────────────
function Avatar({ name, size = 20 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(p => p[0]).join("").toUpperCase().substring(0, 2)
  const hue = name.charCodeAt(0) * 17 % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `hsl(${hue},60%,30%)`,
      border: `1.5px solid hsl(${hue},60%,45%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: `hsl(${hue},60%,85%)`,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

// ─── Kanban card ───────────────────────────────────────────────────────────────
function KanbanCard({
  card,
  col,
  theme,
  onDragStart,
  onClick,
}: {
  card: Card
  col: typeof COLUMNS[0]
  theme: typeof dark
  onDragStart: (id: string) => void
  onClick: (card: Card) => void
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(card.id)}
      onClick={() => onClick(card)}
      style={{
        background: theme.card,
        border: `1px solid rgba(${hexToRgb(col.color)},0.25)`,
        borderLeft: `3px solid ${col.color}`,
        borderRadius: 8,
        padding: "10px 10px 8px",
        cursor: "grab",
        marginBottom: 6,
        transition: "background 0.15s, transform 0.1s",
        userSelect: "none",
        boxShadow: theme === lightTheme ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = theme.cardHover
        e.currentTarget.style.transform = "translateY(-1px)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = theme.card
        e.currentTarget.style.transform = "translateY(0)"
      }}
    >
      {/* Title */}
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: theme.text,
        lineHeight: 1.4,
        marginBottom: 5,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {card.title}
      </div>

      {/* Hypothesis preview */}
      {card.hypothesisText && (
        <div style={{
          fontSize: 11,
          color: "#64748b",
          marginBottom: 8,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}>
          {card.hypothesisText}
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {card.assignee && <Avatar name={card.assignee.name} size={18} />}

        {card.isRDEligible && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "1px 6px",
            borderRadius: 10,
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.25)",
            color: "#34d399",
          }}>
            RS&DE
          </span>
        )}

        {card.pivots.length > 0 && (
          <span style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#fca5a5",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}>
            <GitBranch size={9} />
            {card.pivots.length}
          </span>
        )}

        {card._count.journalEntries > 0 && (
          <span style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 10,
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "#a5b4fc",
            display: "flex",
            alignItems: "center",
            gap: 2,
            marginLeft: "auto",
          }}>
            <BookOpen size={9} />
            {card._count.journalEntries}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── hex to rgb helper ─────────────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

// ─── Create Sprint Dialog ──────────────────────────────────────────────────────
function CreateSprintDialog({
  open, onClose, projectId, onCreated,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  onCreated: (sprint: Sprint) => void
}) {
  const [form, setForm] = useState({ title: "", goal: "", startDate: "", endDate: "", capacity: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title || !form.startDate || !form.endDate) return
    setSaving(true)
    setError(null)
    try {
      const body: any = { title: form.title, startDate: form.startDate, endDate: form.endDate }
      if (form.goal) body.goal = form.goal
      if (form.capacity) body.capacity = Number(form.capacity)
      const res = await fetch(`/api/projets/${projectId}/sprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        onCreated({ ...data, cards: data.cards ?? [] })
        onClose()
        setForm({ title: "", goal: "", startDate: "", endDate: "", capacity: "" })
      } else {
        const errData = await res.json().catch(() => ({}))
        setError(errData?.error ?? `Erreur ${res.status} — veuillez réessayer`)
      }
    } catch (e) {
      setError("Erreur réseau — vérifiez votre connexion")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{
        background: "linear-gradient(135deg, #0a0f1e, #0d1527)",
        border: "1px solid rgba(255,255,255,0.1)",
        maxWidth: 520,
      }}>
        <DialogTitle style={{ color: "white", fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Nouveau sprint R&D</DialogTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: dark.sub, display: "block", marginBottom: 5 }}>
              Titre du sprint <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Sprint 1 — Phase exploratoire" style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: dark.sub, display: "block", marginBottom: 5 }}>Objectif du sprint</label>
            <Textarea value={form.goal} onChange={e => set("goal", e.target.value)} placeholder="Quel est l'objectif principal de ce sprint?" rows={2} style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white", resize: "vertical" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: dark.sub, display: "block", marginBottom: 5 }}>Date de début <span style={{ color: "#ef4444" }}>*</span></label>
              <Input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: dark.sub, display: "block", marginBottom: 5 }}>Date de fin <span style={{ color: "#ef4444" }}>*</span></label>
              <Input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: dark.sub, display: "block", marginBottom: 5 }}>Capacité (heures)</label>
            <Input type="number" value={form.capacity} onChange={e => set("capacity", e.target.value)} placeholder="ex: 80" style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
          </div>
          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 12 }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
            <Button variant="ghost" onClick={onClose} style={{ color: dark.sub }}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.title || !form.startDate || !form.endDate}
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "white", fontWeight: 600 }}
            >
              {saving ? "Création..." : "Créer le sprint"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Create Card Dialog ────────────────────────────────────────────────────────
function CreateCardDialog({
  open, onClose, projectId, members, defaultSprintId, defaultStatus, defaultStatusLabel, onCreated,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  members: { id: string; name: string }[]
  defaultSprintId: string
  defaultStatus: string
  defaultStatusLabel?: string
  onCreated: (card: Card) => void
}) {
  const [form, setForm] = useState({ title: "", hypothesisText: "", assigneeId: "" })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title || !form.hypothesisText) return
    setSaving(true)
    try {
      const body: any = {
        title: form.title,
        hypothesisText: form.hypothesisText,
        sprintId: defaultSprintId,
        status: defaultStatus,
      }
      if (form.assigneeId) body.assigneeId = form.assigneeId
      const res = await fetch(`/api/projets/${projectId}/experiment-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        onCreated({ ...data, pivots: [], _count: { journalEntries: 0 } })
        onClose()
        setForm({ title: "", hypothesisText: "", assigneeId: "" })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{
        background: "linear-gradient(135deg, #0a0f1e, #0d1527)",
        border: "1px solid rgba(255,255,255,0.1)",
        maxWidth: 480,
      }}>
        <DialogTitle style={{ color: "white", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Nouvelle expérience
        </DialogTitle>
        {defaultStatusLabel && (
          <p style={{ fontSize: 12, color: dark.sub, marginBottom: 14 }}>
            Sera créée dans la colonne <strong style={{ color: "white" }}>{defaultStatusLabel}</strong>
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: dark.sub, display: "block", marginBottom: 5 }}>
              Titre <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Nom de l'expérience..." style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: dark.sub, display: "block", marginBottom: 5 }}>
              Hypothèse <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <Textarea
              value={form.hypothesisText}
              onChange={e => set("hypothesisText", e.target.value)}
              placeholder="Si [action], alors [résultat attendu], parce que [justification]..."
              rows={3}
              style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white", resize: "vertical" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: dark.sub, display: "block", marginBottom: 5 }}>Assigné</label>
            <Select value={form.assigneeId} onValueChange={v => set("assigneeId", v)}>
              <SelectTrigger style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                <SelectValue placeholder="Non assigné" />
              </SelectTrigger>
              <SelectContent style={{ background: "#0d1527", border: "1px solid rgba(255,255,255,0.1)" }}>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id} style={{ color: "white" }}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
            <Button variant="ghost" onClick={onClose} style={{ color: dark.sub }}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.title || !form.hypothesisText}
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "white", fontWeight: 600 }}
            >
              {saving ? "Création..." : "Créer l'expérience"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main SprintBoard ──────────────────────────────────────────────────────────
export function SprintBoard({ projectId, members }: Props) {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"futuriste" | "classique">("futuriste")
  const [showCreateSprint, setShowCreateSprint] = useState(false)
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [createCardStatus, setCreateCardStatus] = useState<string>("HYPOTHESIS")
  const [createCardStatusLabel, setCreateCardStatusLabel] = useState<string>("")
  const [selectedCard, setSelectedCard] = useState<CardFull | null>(null)
  const [dragCardId, setDragCardId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [showSprintPicker, setShowSprintPicker] = useState(false)
  const [pivotCard, setPivotCard] = useState<CardFull | null>(null)
  const [showPivotTracker, setShowPivotTracker] = useState(true)

  // Load view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sprint-view-mode")
    if (saved === "futuriste" || saved === "classique") setViewMode(saved)
  }, [])

  const theme = viewMode === "futuriste" ? dark : lightTheme

  // Fetch sprints
  useEffect(() => {
    setLoading(true)
    fetch(`/api/projets/${projectId}/sprints`)
      .then(r => r.json())
      .then((data: Sprint[]) => {
        if (Array.isArray(data)) {
          setSprints(data)
          const active = data.find(s => s.status === "ACTIVE") ?? data[0] ?? null
          setActiveSprint(active)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  // Fetch full card on click
  const handleCardClick = async (card: Card) => {
    try {
      const res = await fetch(`/api/projets/${projectId}/experiment-cards/${card.id}`)
      if (res.ok) {
        const full = await res.json()
        setSelectedCard(full)
      } else {
        // fallback: use partial data as CardFull
        setSelectedCard({
          ...card,
          method: null, materials: null, variables: null,
          expectedResult: null, actualResult: null, conclusion: null,
          sprint: null, hypothesis: null,
          journalEntries: [], attachments: [],
          pivots: card.pivots,
        } as any)
      }
    } catch {
      setSelectedCard({
        ...card,
        method: null, materials: null, variables: null,
        expectedResult: null, actualResult: null, conclusion: null,
        sprint: null, hypothesis: null,
        journalEntries: [], attachments: [],
        pivots: card.pivots,
      } as any)
    }
  }

  // Drag & drop
  const handleDrop = async (colKey: string) => {
    if (!dragCardId || !activeSprint) return
    const card = activeSprint.cards.find(c => c.id === dragCardId)
    if (!card || card.status === colKey) return

    // Optimistic update
    setSprints(prev => prev.map(s =>
      s.id === activeSprint.id
        ? { ...s, cards: s.cards.map(c => c.id === dragCardId ? { ...c, status: colKey as CardStatus } : c) }
        : s
    ))
    setActiveSprint(prev => prev ? {
      ...prev,
      cards: prev.cards.map(c => c.id === dragCardId ? { ...c, status: colKey as CardStatus } : c),
    } : prev)

    setDragCardId(null)
    setDragOverCol(null)

    await fetch(`/api/projets/${projectId}/experiment-cards/${dragCardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: colKey }),
    }).catch(() => {})
  }

  const handleCardUpdated = (updated: CardFull) => {
    setSelectedCard(updated)
    setSprints(prev => prev.map(s => ({
      ...s,
      cards: s.cards.map(c => c.id === updated.id ? {
        ...c,
        title: updated.title,
        status: updated.status as CardStatus,
        hypothesisText: updated.hypothesisText,
        isRDEligible: updated.isRDEligible,
        estimatedHours: updated.estimatedHours,
        actualHours: updated.actualHours,
        assignee: updated.assignee,
        resultType: updated.resultType,
      } : c),
    })))
    if (activeSprint) {
      setActiveSprint(prev => prev ? {
        ...prev,
        cards: prev.cards.map(c => c.id === updated.id ? { ...c, ...updated, status: updated.status as CardStatus } : c),
      } : prev)
    }
  }

  const handleCardCreated = (card: Card) => {
    setSprints(prev => prev.map(s =>
      s.id === activeSprint?.id ? { ...s, cards: [...s.cards, card] } : s
    ))
    setActiveSprint(prev => prev ? { ...prev, cards: [...prev.cards, card] } : prev)
    setShowCreateCard(false)
  }

  const handleSprintCreated = (sprint: Sprint) => {
    setSprints(prev => [...prev, sprint])
    setActiveSprint(sprint)
  }

  const sprintStatus = activeSprint ? (STATUS_SPRINT[activeSprint.status] ?? STATUS_SPRINT.PLANNING) : null

  const allCards = sprints.flatMap(s => s.cards)
  const cardSummaries = allCards.map(c => ({ id: c.id, title: c.title, status: c.status }))

  const toggleView = () => {
    const next = viewMode === "futuriste" ? "classique" : "futuriste"
    setViewMode(next)
    localStorage.setItem("sprint-view-mode", next)
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: theme.bg }}>
      {/* ── Header ── */}
      <div style={{
        background: theme.headerBg,
        borderBottom: `1px solid ${theme.headerBorder}`,
        padding: "14px 20px",
        flexShrink: 0,
        boxShadow: viewMode === "classique" ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚗️</span>
            <span style={{ color: theme.text, fontSize: 16, fontWeight: 700 }}>Board R&D</span>
          </div>

          {/* Sprint selector */}
          {sprints.length > 0 && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowSprintPicker(!showSprintPicker)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: viewMode === "futuriste" ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {activeSprint?.title ?? "Sélectionner un sprint"}
                <ChevronDown size={13} />
              </button>
              {showSprintPicker && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  zIndex: 50,
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  overflow: "hidden",
                  minWidth: 220,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                }}>
                  {sprints.map(s => {
                    const sc = STATUS_SPRINT[s.status] ?? STATUS_SPRINT.PLANNING
                    return (
                      <button
                        key={s.id}
                        onClick={() => { setActiveSprint(s); setShowSprintPicker(false) }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "8px 12px",
                          background: activeSprint?.id === s.id ? theme.colBg : "transparent",
                          border: "none",
                          cursor: "pointer",
                          gap: 8,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = theme.colBg)}
                        onMouseLeave={e => (e.currentTarget.style.background = activeSprint?.id === s.id ? theme.colBg : "transparent")}
                      >
                        <span style={{ color: theme.text, fontSize: 13 }}>{s.title}</span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "1px 7px",
                          borderRadius: 10,
                          background: sc.bg,
                          color: sc.color,
                        }}>
                          {sc.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={() => setShowCreateSprint(true)}
            size="sm"
            style={{
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.3)",
              color: "#c4b5fd",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            <Plus size={13} style={{ marginRight: 4 }} />
            Nouveau sprint
          </Button>

          {/* View toggle */}
          <button
            onClick={toggleView}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 8,
              background: viewMode === "futuriste" ? "rgba(6,182,212,0.1)" : "rgba(99,102,241,0.1)",
              border: `1px solid ${viewMode === "futuriste" ? "rgba(6,182,212,0.3)" : "rgba(99,102,241,0.3)"}`,
              color: viewMode === "futuriste" ? "#06b6d4" : "#6366f1",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {viewMode === "futuriste" ? "☀️ Vue classique" : "🌙 Vue futuriste"}
          </button>

          {/* Pivot tracker toggle */}
          <button
            onClick={() => setShowPivotTracker(!showPivotTracker)}
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: theme.sub,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ChevronRight
              size={13}
              style={{ transform: showPivotTracker ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            />
            Pivots R&D
          </button>
        </div>

        {/* Sprint info bar */}
        {activeSprint && sprintStatus && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${theme.headerBorder}`,
            flexWrap: "wrap",
          }}>
            {/* Status badge */}
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 10px",
              borderRadius: 20,
              background: sprintStatus.bg,
              color: sprintStatus.color,
              border: `1px solid ${sprintStatus.color}44`,
            }}>
              {sprintStatus.label}
            </span>

            {/* Dates */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: theme.sub }}>
              <Calendar size={12} />
              {new Date(activeSprint.startDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
              {" → "}
              {new Date(activeSprint.endDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
            </div>

            {/* Capacity */}
            {activeSprint.capacity && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: theme.sub }}>
                <Clock size={12} />
                {activeSprint.capacity}h capacité
              </div>
            )}

            {/* Goal */}
            {activeSprint.goal && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: theme.sub }}>
                <Target size={12} />
                <span style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeSprint.goal}
                </span>
              </div>
            )}

            {/* Card count */}
            <span style={{ fontSize: 12, color: theme.sub, marginLeft: "auto" }}>
              {activeSprint.cards.length} expérience{activeSprint.cards.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {!loading && sprints.length === 0 && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⚗️</div>
            <h3 style={{ color: theme.text, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Créez votre premier sprint R&D
            </h3>
            <p style={{ color: theme.sub, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Organisez vos expériences scientifiques en sprints pour suivre votre avancement
              et documenter votre démarche RS&DE.
            </p>
            <Button
              onClick={() => setShowCreateSprint(true)}
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                padding: "10px 24px",
                height: "auto",
              }}
            >
              <Plus size={16} style={{ marginRight: 8 }} />
              Créer le premier sprint
            </Button>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: theme.sub }}>
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          Chargement...
        </div>
      )}

      {/* ── Kanban board ── */}
      {!loading && activeSprint && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            padding: "16px 20px",
            minHeight: 0,
          }}>
            {COLUMNS.map(col => {
              const colCards = activeSprint.cards.filter(c => c.status === col.key)
              const isDragOver = dragOverCol === col.key

              return (
                <div
                  key={col.key}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(col.key) }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={() => handleDrop(col.key)}
                  style={{
                    minWidth: 220,
                    maxWidth: 260,
                    width: 240,
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    background: isDragOver ? `rgba(${hexToRgb(col.color)},0.06)` : theme.colBg,
                    border: isDragOver ? `1px solid ${col.color}44` : `1px solid ${theme.border}`,
                    borderRadius: 10,
                    padding: "10px 8px",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  {/* Column header */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 10,
                    paddingBottom: 8,
                    borderBottom: `1px solid rgba(${hexToRgb(col.color)},0.15)`,
                  }}>
                    <span style={{ fontSize: 13 }}>{col.icon}</span>
                    <span style={{ color: theme.text, fontSize: 12, fontWeight: 600, flex: 1 }}>{col.label}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "1px 7px",
                      borderRadius: 10,
                      background: `rgba(${hexToRgb(col.color)},0.15)`,
                      color: col.color,
                      border: `1px solid rgba(${hexToRgb(col.color)},0.25)`,
                    }}>
                      {colCards.length}
                    </span>
                  </div>

                  {/* Cards list */}
                  <div style={{ flex: 1, overflowY: "auto", minHeight: 60 }}>
                    {colCards
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map(card => (
                        <KanbanCard
                          key={card.id}
                          card={card}
                          col={col}
                          theme={theme}
                          onDragStart={setDragCardId}
                          onClick={handleCardClick}
                        />
                      ))}
                  </div>

                  {/* Add card button — not shown in PIVOTED column */}
                  <button
                    onClick={() => { setCreateCardStatus(col.key); setCreateCardStatusLabel(col.label); setShowCreateCard(true) }}
                    style={{
                      display: col.key === "PIVOTED" ? "none" : "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 4px",
                      marginTop: 6,
                      borderRadius: 6,
                      background: "none",
                      border: "none",
                      color: theme.sub,
                      fontSize: 12,
                      cursor: "pointer",
                      width: "100%",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = col.color)}
                    onMouseLeave={e => (e.currentTarget.style.color = theme.sub)}
                  >
                    <Plus size={12} />
                    Ajouter
                  </button>
                </div>
              )
            })}
          </div>

          {/* ── Pivot Tracker ── */}
          {showPivotTracker && (
            <div style={{ padding: "0 20px 24px" }}>
              <PivotTracker
                projectId={projectId}
                experimentCards={cardSummaries}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Dialogs ── */}
      <CreateSprintDialog
        open={showCreateSprint}
        onClose={() => setShowCreateSprint(false)}
        projectId={projectId}
        onCreated={handleSprintCreated}
      />

      {activeSprint && (
        <CreateCardDialog
          open={showCreateCard}
          onClose={() => setShowCreateCard(false)}
          projectId={projectId}
          members={members}
          defaultSprintId={activeSprint.id}
          defaultStatus={createCardStatus}
          defaultStatusLabel={createCardStatusLabel}
          onCreated={handleCardCreated}
        />
      )}

      {selectedCard && (
        <ExperimentCardModal
          card={selectedCard}
          projectId={projectId}
          members={members}
          onClose={() => setSelectedCard(null)}
          onUpdated={handleCardUpdated}
          onPivot={(card) => {
            setSelectedCard(null)
            setPivotCard(card)
            setShowPivotTracker(true)
          }}
        />
      )}
    </div>
  )
}
