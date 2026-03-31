"use client"
import { useThemeColors } from "@/hooks/use-theme-colors"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExperimentCardModal } from "@/components/sprints/experiment-card-modal"
import {
  Beaker, Plus, Search, Filter, LayoutGrid, LayoutList,
  Clock, User, GitBranch, BookOpen, CheckCircle, XCircle,
  Microscope, Sparkles, Target, FlaskConical,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────
type Card = {
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
  sortOrder: number
  project: { id: string; name: string; code: string }
  assignee?: { id: string; name: string } | null
  sprint?: { id: string; title: string } | null
  hypothesis?: { id: string; title: string } | null
  pivots: { id: string }[]
  _count: { journalEntries: number; attachments: number }
}

type Project = { id: string; name: string; code: string }
type Member  = { id: string; name: string }

interface Props {
  cards: Card[]
  projects: Project[]
  members: Member[]
}

// ── Config statuts ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  HYPOTHESIS:       { label: "Hypothèse",        color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  border: "rgba(139,92,246,0.25)" },
  PROTOCOL_DEFINED: { label: "Protocole défini", color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.25)" },
  IN_PROGRESS:      { label: "En cours",         color: "#f97316", bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.25)" },
  RESULT_OBTAINED:  { label: "Résultat obtenu",  color: "#06b6d4", bg: "rgba(6,182,212,0.1)",   border: "rgba(6,182,212,0.25)"  },
  ANALYSIS:         { label: "Analyse",          color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  VALIDATED:        { label: "Validée",          color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)" },
  PIVOTED:          { label: "Pivot",            color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)"  },
}
const STATUS_ORDER = Object.keys(STATUS_CFG) as (keyof typeof STATUS_CFG)[]



// ── Kanban card ────────────────────────────────────────────────────────────────
function KanbanCard({ card, onClick }: { card: Card; onClick: () => void }) {
  const dark = useThemeColors()
  const cfg = STATUS_CFG[card.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.HYPOTHESIS
  const hasPivots = card.pivots.length > 0
  const hasJournal = card._count.journalEntries > 0

  return (
    <div
      onClick={onClick}
      style={{
        background: dark.card, border: `1px solid ${cfg.border}`,
        borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "all 0.18s",
        marginBottom: 8,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-3px)"
        e.currentTarget.style.boxShadow = `0 8px 24px ${cfg.color}22`
        e.currentTarget.style.borderColor = cfg.color
        e.currentTarget.style.background = dark.hover
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = ""
        e.currentTarget.style.boxShadow = ""
        e.currentTarget.style.borderColor = cfg.border
        e.currentTarget.style.background = dark.card
      }}
    >
      {/* Barre couleur statut */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}55)` }} />

      <div style={{ padding: "10px 12px" }}>
        {/* Projet badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8",
          }}>
            {card.project.code}
          </span>
          {!card.isRDEligible && (
            <span style={{ fontSize: 9, color: dark.sub }}>non RS&DE</span>
          )}
        </div>

        {/* Titre */}
        <p style={{ fontSize: 13, fontWeight: 600, color: dark.text, lineHeight: 1.4, marginBottom: 6 }}>
          {card.title}
        </p>

        {/* Hypothèse (courte) */}
        <p style={{ fontSize: 11, color: dark.sub, lineHeight: 1.5, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {card.hypothesisText}
        </p>

        {/* Footer meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {card.assignee && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: dark.sub }}>
              <User size={10} /> {card.assignee.name}
            </span>
          )}
          {card.estimatedHours && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: dark.sub }}>
              <Clock size={10} /> {card.estimatedHours}h
            </span>
          )}
          {hasPivots && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#fca5a5", fontWeight: 600 }}>
              <GitBranch size={10} /> {card.pivots.length}
            </span>
          )}
          {hasJournal && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#818cf8" }}>
              <BookOpen size={10} /> {card._count.journalEntries}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Liste card ─────────────────────────────────────────────────────────────────
function ListCard({ card, onClick }: { card: Card; onClick: () => void }) {
  const dark = useThemeColors()
  const cfg = STATUS_CFG[card.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.HYPOTHESIS

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", borderRadius: 10,
        background: dark.card, border: `1px solid ${dark.border}`,
        cursor: "pointer", transition: "all 0.15s", marginBottom: 6,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateX(4px)"
        e.currentTarget.style.background = dark.hover
        e.currentTarget.style.borderColor = cfg.border
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = ""
        e.currentTarget.style.background = dark.hover
        e.currentTarget.style.borderColor = dark.border
      }}
    >
      {/* Dot statut */}
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.color, flexShrink: 0, boxShadow: `0 0 8px ${cfg.color}88` }} />

      {/* Titre + projet */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: dark.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.title}</p>
        <p style={{ fontSize: 11, color: dark.sub, margin: 0 }}>{card.project.code} · {card.project.name}</p>
      </div>

      {/* Statut badge */}
      <span style={{
        fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8, flexShrink: 0,
        background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
      }}>
        {cfg.label}
      </span>

      {/* Meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {card.assignee && <span style={{ fontSize: 11, color: dark.sub, display: "flex", alignItems: "center", gap: 3 }}><User size={11} /> {card.assignee.name}</span>}
        {card.estimatedHours && <span style={{ fontSize: 11, color: dark.sub, display: "flex", alignItems: "center", gap: 3 }}><Clock size={11} /> {card.estimatedHours}h</span>}
        {card.pivots.length > 0 && <span style={{ fontSize: 11, color: "#fca5a5", display: "flex", alignItems: "center", gap: 3 }}><GitBranch size={11} /> {card.pivots.length}</span>}
      </div>
    </div>
  )
}

// ── Dialog nouvelle carte ──────────────────────────────────────────────────────
function NewCardDialog({ open, onClose, projects, onCreated }: {
  open: boolean; onClose: () => void
  projects: Project[]; onCreated: (card: Card) => void
}) {
  const dark = useThemeColors()
  const [form, setForm] = useState({ projectId: "", title: "", hypothesisText: "", estimatedHours: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  function handleClose() {
    setForm({ projectId: "", title: "", hypothesisText: "", estimatedHours: "" })
    setError(""); onClose()
  }

  async function handleSubmit() {
    if (!form.projectId) { setError("Sélectionnez un projet."); return }
    if (!form.title || !form.hypothesisText) { setError("Titre et hypothèse requis."); return }
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/projets/${form.projectId}/experiment-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title, hypothesisText: form.hypothesisText,
          estimatedHours: form.estimatedHours || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onCreated(data)
        handleClose()
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d?.error ?? `Erreur ${res.status}`)
      }
    } catch { setError("Erreur réseau") }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent style={{
        background: dark.panel,
        border: "1px solid rgba(139,92,246,0.25)", maxWidth: 540,
      }}>
        <DialogTitle style={{ color: dark.text, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: "2px solid rgba(139,92,246,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Beaker size={13} color="#8b5cf6" />
          </div>
          Nouvelle expérience R&D
        </DialogTitle>
        <p style={{ fontSize: 12, color: dark.sub, marginBottom: 16 }}>
          Chaque expérience documente une hypothèse scientifique à tester — preuve d'incertitude technologique pour RS&DE.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div>
            <label style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Projet *</label>
            <Select value={form.projectId} onValueChange={v => set("projectId", v)}>
              <SelectTrigger style={{ background: dark.card, border: "1px solid rgba(99,102,241,0.3)", color: dark.text }}>
                <SelectValue placeholder="Sélectionner un projet…" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>[{p.code}] {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 700, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Titre de l'expérience *</label>
            <Input value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="ex: Test de résistance du polymère X à 80°C"
              style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: dark.text }} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 700, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Hypothèse *</label>
            <Textarea rows={3} value={form.hypothesisText} onChange={e => set("hypothesisText", e.target.value)}
              placeholder="Si on applique X à Y, alors on s'attend à Z parce que…"
              style={{ background: dark.card, border: "1px solid rgba(139,92,246,0.15)", color: dark.text, resize: "vertical" }} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={11} /> Heures estimées</span>
            </label>
            <Input value={form.estimatedHours} onChange={e => set("estimatedHours", e.target.value)}
              type="number" placeholder="ex: 12"
              style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: dark.text }} />
          </div>

          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 12 }}>{error}</div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
            <button onClick={handleClose} style={{ padding: "9px 16px", borderRadius: 8, background: dark.input, border: "1px solid rgba(255,255,255,0.1)", color: dark.sub, fontSize: 13, cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={saving || !form.projectId || !form.title || !form.hypothesisText}
              style={{
                padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", border: "none", color: "white",
                boxShadow: "0 4px 14px rgba(139,92,246,0.35)",
                opacity: saving || !form.projectId || !form.title || !form.hypothesisText ? 0.6 : 1,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(139,92,246,0.45)" } }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 14px rgba(139,92,246,0.35)" }}
            >
              {saving ? "Création…" : "Créer l'expérience"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────
export function ExperiencesClient({ cards: initialCards, projects, members }: Props) {
  const dark = useThemeColors()
  const [cards, setCards]           = useState<Card[]>(initialCards)
  const [search, setSearch]         = useState("")
  const [filterProject, setFilter]  = useState("all")
  const [filterStatus, setFilterS]  = useState("all")
  const [view, setView]             = useState<"kanban" | "list">("kanban")
  const [showNew, setShowNew]       = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)

  // Filtres
  const visible = cards.filter(c => {
    if (filterProject !== "all" && c.project.id !== filterProject) return false
    if (filterStatus !== "all" && c.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return c.title.toLowerCase().includes(q) || c.hypothesisText.toLowerCase().includes(q)
    }
    return true
  })

  // Stats
  const total     = cards.length
  const validated = cards.filter(c => c.status === "VALIDATED").length
  const pivoted   = cards.filter(c => c.status === "PIVOTED").length
  const inProgress = cards.filter(c => c.status === "IN_PROGRESS").length
  const totalHours = cards.reduce((s, c) => s + (c.estimatedHours ?? 0), 0)

  function handleCreated(card: Card) {
    setCards(prev => [card, ...prev])
  }

  function handleUpdated(updated: Card) {
    setCards(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
    setSelectedCard(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
  }

  function handlePivot(card: Card) {
    // Ouvrir le pivot tracker — pour l'instant on ferme le modal
    setSelectedCard(null)
  }

  return (
    <div style={{ minHeight: "100vh", background: dark.bg, paddingBottom: 60 }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: dark.panel,
        borderBottom: "1px solid rgba(139,92,246,0.2)",
        padding: "28px 32px 24px",
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "rgba(139,92,246,0.12)", border: "2px solid rgba(139,92,246,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 18px rgba(139,92,246,0.2)",
              }}>
                <Beaker size={20} color="#8b5cf6" />
              </div>
              <div>
                <h1 style={{ color: dark.text, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>Expériences R&D</h1>
                <p style={{ fontSize: 13, color: dark.sub, margin: 0, marginTop: 2 }}>Agile R&D · Kanban des hypothèses scientifiques</p>
              </div>
            </div>

            <button onClick={() => setShowNew(true)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, cursor: "pointer",
              background: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(139,92,246,0.08))",
              border: "1px solid rgba(139,92,246,0.4)", color: "#c4b5fd",
              fontSize: 13, fontWeight: 700, transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(139,92,246,0.25)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}
            >
              <Plus size={15} /> Nouvelle expérience
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "Total", value: total, color: "#8b5cf6", icon: <Beaker size={13} /> },
              { label: "En cours", value: inProgress, color: "#f97316", icon: <Microscope size={13} /> },
              { label: "Validées", value: validated, color: "#10b981", icon: <CheckCircle size={13} /> },
              { label: "Pivots", value: pivoted, color: "#ef4444", icon: <GitBranch size={13} /> },
              { label: "Heures estimées", value: `${totalHours}h`, color: dark.sub, icon: <Clock size={13} /> },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 8, background: dark.card, border: `1px solid ${dark.border}` }}>
                <span style={{ color: s.color }}>{s.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: dark.text }}>{s.value}</span>
                <span style={{ fontSize: 11, color: dark.sub }}>{s.label}</span>
              </div>
            ))}
            {validated > 0 && total > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <Sparkles size={13} color="#10b981" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>{Math.round(validated / total * 100)}% validées</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div style={{ background: dark.bg, borderBottom: `1px solid ${dark.border}`, padding: "12px 32px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1", minWidth: 200, maxWidth: 320 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: dark.sub, pointerEvents: "none" }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une expérience…"
              style={{
                width: "100%", padding: "7px 10px 7px 30px", borderRadius: 8,
                background: dark.input, border: "1px solid rgba(255,255,255,0.1)",
                color: dark.text, fontSize: 12, outline: "none",
              }}
            />
          </div>

          {/* Filtre projet */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={12} color={dark.sub} />
            <select value={filterProject} onChange={e => setFilter(e.target.value)}
              style={{ background: dark.input, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: dark.text, fontSize: 12, padding: "5px 10px", cursor: "pointer", outline: "none" }}>
              <option value="all">Tous les projets</option>
              {projects.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
            </select>
          </div>

          {/* Filtre statut */}
          <select value={filterStatus} onChange={e => setFilterS(e.target.value)}
            style={{ background: dark.input, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: dark.text, fontSize: 12, padding: "5px 10px", cursor: "pointer", outline: "none" }}>
            <option value="all">Tous les statuts</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
          </select>

          {/* Toggle vue */}
          <div style={{ display: "flex", gap: 4, background: dark.card, borderRadius: 8, padding: 3, marginLeft: "auto" }}>
            {([["kanban", LayoutGrid, "Kanban"], ["list", LayoutList, "Liste"]] as const).map(([v, Icon, label]) => (
              <button key={v} onClick={() => setView(v as "kanban" | "list")}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                  background: view === v ? "rgba(139,92,246,0.2)" : "transparent",
                  border: view === v ? "1px solid rgba(139,92,246,0.35)" : "1px solid transparent",
                  color: view === v ? "#c4b5fd" : dark.sub, transition: "all 0.15s",
                }}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contenu ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 32px" }}>

        {/* Vue Kanban */}
        {view === "kanban" && (
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
            {STATUS_ORDER.map(status => {
              const cfg = STATUS_CFG[status]
              const col = visible.filter(c => c.status === status)
              return (
                <div key={status} style={{ minWidth: 240, width: 260, flexShrink: 0 }}>
                  {/* Entête colonne */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                    padding: "8px 12px", borderRadius: 9,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                    <span style={{
                      marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 20,
                      background: "rgba(0,0,0,0.3)", color: cfg.color,
                    }}>
                      {col.length}
                    </span>
                  </div>

                  {/* Cartes */}
                  {col.length === 0 ? (
                    <div style={{ padding: "20px 0", textAlign: "center", border: `1px dashed ${cfg.border}`, borderRadius: 10, color: dark.sub, fontSize: 11 }}>
                      Aucune
                    </div>
                  ) : (
                    col.map(card => (
                      <KanbanCard key={card.id} card={card} onClick={() => setSelectedCard(card)} />
                    ))
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Vue Liste */}
        {view === "list" && (
          <div>
            {visible.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", border: "1px dashed rgba(139,92,246,0.2)", borderRadius: 14, background: "rgba(139,92,246,0.02)" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(139,92,246,0.1)", border: "2px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <FlaskConical size={22} color="#8b5cf6" />
                </div>
                <p style={{ color: dark.text, fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Aucune expérience trouvée</p>
                <p style={{ color: dark.sub, fontSize: 13 }}>Ajustez vos filtres ou créez une nouvelle expérience.</p>
              </div>
            ) : (
              visible.map(card => (
                <ListCard key={card.id} card={card} onClick={() => setSelectedCard(card)} />
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <NewCardDialog
        open={showNew} onClose={() => setShowNew(false)}
        projects={projects} onCreated={handleCreated}
      />

      {selectedCard && (
        <ExperimentCardModal
          card={selectedCard as any}
          projectId={selectedCard.project.id}
          members={members}
          onClose={() => setSelectedCard(null)}
          onUpdated={card => handleUpdated(card as any)}
          onPivot={card => handlePivot(card as any)}
        />
      )}
    </div>
  )
}
