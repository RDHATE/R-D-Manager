"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  RefreshCw, Plus, ChevronDown, ChevronRight, Calendar, User,
  AlertCircle, Lightbulb, DollarSign, Clock, ArrowRight,
  GitBranch, LayoutList, Network, TrendingDown,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────
export type Pivot = {
  id: string
  reason: string
  oldDirection: string
  newDirection: string
  lessons?: string | null
  budgetImpact?: string | null
  timelineImpact?: string | null
  createdAt: string
  experimentCard?: { id: string; title: string; status: string } | null
  createdBy?: { name: string } | null
  project?: { id: string; name: string; code: string }
  childPivots: Pivot[]
  parentPivotId?: string | null
}

interface Props {
  projectId: string
  experimentCards: { id: string; title: string; status: string }[]
  initialPivots?: Pivot[]
}

const dark = {
  bg:     "#0a0f1e",
  card:   "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  text:   "white",
  sub:    "#64748b",
  muted:  "#475569",
}

// ── Nœud arbre ────────────────────────────────────────────────────────────────
function PivotNode({ pivot, depth = 0, isLast = true }: { pivot: Pivot; depth?: number; isLast?: boolean }) {
  const [collapsed, setCollapsed] = useState(false)
  const hasChildren = pivot.childPivots?.length > 0
  const date = new Date(pivot.createdAt).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" })
  const hasImpact = pivot.budgetImpact || pivot.timelineImpact

  return (
    <div style={{ position: "relative" }}>
      {/* Ligne verticale du parent */}
      {depth > 0 && (
        <div style={{
          position: "absolute", left: -24, top: 0, bottom: isLast ? "50%" : 0,
          width: 2, background: "rgba(239,68,68,0.25)",
        }} />
      )}
      {/* Connecteur horizontal */}
      {depth > 0 && (
        <div style={{
          position: "absolute", left: -24, top: 22,
          width: 20, height: 2, background: "rgba(239,68,68,0.25)",
        }} />
      )}

      <div style={{
        display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10,
        marginLeft: depth > 0 ? 0 : 0,
      }}>
        {/* Icône pivot */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0, marginTop: 4,
          background: "rgba(239,68,68,0.12)",
          border: "2px solid rgba(239,68,68,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 12px rgba(239,68,68,0.15)",
        }}>
          <RefreshCw size={14} color="#ef4444" />
        </div>

        {/* Carte pivot */}
        <div style={{
          flex: 1,
          background: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.18)",
          borderRadius: 12,
          overflow: "hidden",
          transition: "all 0.15s",
          cursor: "default",
        }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-2px)"
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(239,68,68,0.15)"
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)"
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = ""
            e.currentTarget.style.boxShadow = ""
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.18)"
          }}
        >
          {/* Barre rouge en haut */}
          <div style={{ height: 3, background: "linear-gradient(90deg, #ef4444, #ef444444)" }} />

          <div style={{ padding: "12px 14px" }}>
            {/* Méta */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: dark.sub }}>
                <Calendar size={11} /> {date}
              </span>
              {pivot.createdBy && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: dark.sub }}>
                  <User size={11} /> {pivot.createdBy.name}
                </span>
              )}
              {pivot.experimentCard && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 10,
                  background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa",
                }}>
                  {pivot.experimentCard.title}
                </span>
              )}
              {pivot.project && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 8,
                  background: "rgba(255,255,255,0.06)", color: "#64748b",
                }}>
                  {pivot.project.code}
                </span>
              )}
            </div>

            {/* Raison */}
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Raison de l'échec</p>
              <p style={{ fontSize: 13, color: "#fca5a5", lineHeight: 1.5 }}>{pivot.reason}</p>
            </div>

            {/* Avant → Après */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8,
              background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)",
              marginBottom: hasImpact || pivot.lessons ? 10 : 0,
            }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Ancienne direction</p>
                <p style={{ fontSize: 12, color: "#94a3b8", textDecoration: "line-through", lineHeight: 1.5 }}>{pivot.oldDirection}</p>
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ArrowRight size={13} color="#ef4444" />
              </div>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Nouvelle direction</p>
                <p style={{ fontSize: 12, color: "#6ee7b7", fontWeight: 600, lineHeight: 1.5 }}>{pivot.newDirection}</p>
              </div>
            </div>

            {/* Leçons */}
            {pivot.lessons && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "8px 10px", borderRadius: 8, marginBottom: 8,
                background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
              }}>
                <Lightbulb size={13} style={{ color: "#10b981", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: "#6ee7b7", lineHeight: 1.5 }}><strong>Leçons :</strong> {pivot.lessons}</p>
              </div>
            )}

            {/* Impacts */}
            {hasImpact && (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {pivot.budgetImpact && (
                  <span style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 10,
                    background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24",
                  }}>
                    <DollarSign size={11} /> {pivot.budgetImpact}
                  </span>
                )}
                {pivot.timelineImpact && (
                  <span style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 10,
                    background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa",
                  }}>
                    <Clock size={11} /> {pivot.timelineImpact}
                  </span>
                )}
              </div>
            )}

            {/* Enfants collapsible */}
            {hasChildren && (
              <button onClick={() => setCollapsed(!collapsed)} style={{
                display: "flex", alignItems: "center", gap: 5,
                marginTop: 10, fontSize: 11, fontWeight: 600, color: "#fca5a5",
                background: "none", border: "none", cursor: "pointer", padding: 0,
                transition: "color 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                onMouseLeave={e => (e.currentTarget.style.color = "#fca5a5")}
              >
                {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                {pivot.childPivots.length} pivot{pivot.childPivots.length > 1 ? "s" : ""} dérivé{pivot.childPivots.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enfants */}
      {!collapsed && hasChildren && (
        <div style={{ paddingLeft: 48, position: "relative", marginBottom: 4 }}>
          {pivot.childPivots.map((child, i) => (
            <PivotNode key={child.id} pivot={child} depth={depth + 1} isLast={i === pivot.childPivots.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Vue timeline ───────────────────────────────────────────────────────────────
function TimelineView({ pivots }: { pivots: Pivot[] }) {
  const flat: Pivot[] = []
  const flatten = (list: Pivot[]) => list.forEach(p => { flat.push(p); if (p.childPivots) flatten(p.childPivots) })
  flatten(pivots)
  flat.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  if (flat.length === 0) return null

  return (
    <div style={{ position: "relative", paddingLeft: 28 }}>
      <div style={{ position: "absolute", left: 10, top: 0, bottom: 0, width: 2, background: "rgba(239,68,68,0.2)", borderRadius: 1 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {flat.map((p, i) => {
          const date = new Date(p.createdAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })
          return (
            <div key={p.id} style={{ position: "relative" }}>
              {/* Point timeline */}
              <div style={{
                position: "absolute", left: -22, top: 14,
                width: 12, height: 12, borderRadius: "50%",
                background: "#ef4444", border: "2px solid #0a0f1e",
                boxShadow: "0 0 8px rgba(239,68,68,0.5)",
              }} />
              <div style={{
                background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: 10, padding: "10px 14px", transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(239,68,68,0.12)" }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444" }}>Pivot #{i + 1}</span>
                  <span style={{ fontSize: 10, color: dark.sub }}>{date}</span>
                  {p.createdBy && <span style={{ fontSize: 10, color: dark.sub }}>· {p.createdBy.name}</span>}
                  {p.experimentCard && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 8, background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                      {p.experimentCard.title}
                    </span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                  <p style={{ fontSize: 11, color: "#94a3b8", textDecoration: "line-through" }}>{p.oldDirection}</p>
                  <ArrowRight size={12} color="#ef4444" />
                  <p style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 600 }}>{p.newDirection}</p>
                </div>
                {(p.budgetImpact || p.timelineImpact) && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {p.budgetImpact && <span style={{ fontSize: 10, color: "#fbbf24", display: "flex", alignItems: "center", gap: 3 }}><DollarSign size={10} />{p.budgetImpact}</span>}
                    {p.timelineImpact && <span style={{ fontSize: 10, color: "#60a5fa", display: "flex", alignItems: "center", gap: 3 }}><Clock size={10} />{p.timelineImpact}</span>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Dialog création ────────────────────────────────────────────────────────────
function CreatePivotDialog({ open, onClose, projectId, experimentCards, pivots, onCreated }: {
  open: boolean; onClose: () => void; projectId: string
  experimentCards: { id: string; title: string; status: string }[]
  pivots: Pivot[]; onCreated: (p: Pivot) => void
}) {
  const [form, setForm] = useState({
    experimentCardId: "", reason: "", oldDirection: "", newDirection: "",
    lessons: "", budgetImpact: "", timelineImpact: "", parentPivotId: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  const flat: Pivot[] = []
  const flatten = (list: Pivot[]) => list.forEach(p => { flat.push(p); if (p.childPivots) flatten(p.childPivots) })
  flatten(pivots)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.reason || !form.oldDirection || !form.newDirection) {
      setError("Les 3 champs marqués * sont requis."); return
    }
    setSaving(true); setError("")
    try {
      const body: Record<string, string> = {
        reason: form.reason, oldDirection: form.oldDirection, newDirection: form.newDirection,
      }
      if (form.experimentCardId) body.experimentCardId = form.experimentCardId
      if (form.lessons)          body.lessons          = form.lessons
      if (form.budgetImpact)     body.budgetImpact     = form.budgetImpact
      if (form.timelineImpact)   body.timelineImpact   = form.timelineImpact
      if (form.parentPivotId)    body.parentPivotId    = form.parentPivotId

      const res = await fetch(`/api/projets/${projectId}/pivots`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        onCreated(data)
        onClose()
        setForm({ experimentCardId: "", reason: "", oldDirection: "", newDirection: "", lessons: "", budgetImpact: "", timelineImpact: "", parentPivotId: "" })
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d?.error ?? `Erreur ${res.status}`)
      }
    } catch { setError("Erreur réseau") }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{
        background: "linear-gradient(135deg, #0a0f1e, #0d1527)",
        border: "1px solid rgba(239,68,68,0.2)", maxWidth: 580, maxHeight: "90vh", overflowY: "auto",
      }}>
        <DialogTitle style={{ color: "white", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={13} color="#ef4444" />
          </div>
          Documenter un pivot R&D
        </DialogTitle>
        <p style={{ fontSize: 12, color: dark.sub, marginBottom: 16, lineHeight: 1.6 }}>
          Chaque pivot documenté est une preuve d'incertitude technologique valide pour les crédits RS&DE / SR&ED.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {/* Expérience liée */}
          <div>
            <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Expérience concernée</label>
            <Select value={form.experimentCardId} onValueChange={v => set("experimentCardId", v)}>
              <SelectTrigger style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                <SelectValue placeholder="Sélectionner une expérience…" />
              </SelectTrigger>
              <SelectContent>
                {experimentCards.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Raison */}
          <div>
            <label style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Raison de l'échec *
            </label>
            <Textarea rows={2} value={form.reason} onChange={e => set("reason", e.target.value)}
              placeholder="Décrivez pourquoi l'hypothèse initiale n'a pas été validée…"
              style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white", resize: "vertical" }} />
          </div>

          {/* Avant / Après */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Ancienne direction *
              </label>
              <Textarea rows={2} value={form.oldDirection} onChange={e => set("oldDirection", e.target.value)}
                placeholder="Hypothèse initiale abandonnée…"
                style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white", resize: "vertical" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#10b981", fontWeight: 700, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Nouvelle direction *
              </label>
              <Textarea rows={2} value={form.newDirection} onChange={e => set("newDirection", e.target.value)}
                placeholder="Nouvelle hypothèse ou approche…"
                style={{ background: dark.card, border: "1px solid rgba(16,185,129,0.15)", color: "white", resize: "vertical" }} />
            </div>
          </div>

          {/* Leçons */}
          <div>
            <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Lightbulb size={11} /> Leçons scientifiques</span>
            </label>
            <Textarea rows={2} value={form.lessons} onChange={e => set("lessons", e.target.value)}
              placeholder="Qu'avez-vous appris de cette expérience ?"
              style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white", resize: "vertical" }} />
          </div>

          {/* Impacts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "#fbbf24", fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><DollarSign size={11} /> Impact budgétaire</span>
              </label>
              <Input value={form.budgetImpact} onChange={e => set("budgetImpact", e.target.value)}
                placeholder="ex: +15 000 $"
                style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#60a5fa", fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={11} /> Impact calendrier</span>
              </label>
              <Input value={form.timelineImpact} onChange={e => set("timelineImpact", e.target.value)}
                placeholder="ex: +3 semaines"
                style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
          </div>

          {/* Pivot parent */}
          {flat.length > 0 && (
            <div>
              <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Dérivé d'un pivot précédent</label>
              <Select value={form.parentPivotId} onValueChange={v => set("parentPivotId", v)}>
                <SelectTrigger style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                  <SelectValue placeholder="Aucun pivot parent…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {flat.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.newDirection.substring(0, 55)}…</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 12 }}>{error}</div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
            <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: dark.sub, fontSize: 13, cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={saving || !form.reason || !form.oldDirection || !form.newDirection}
              style={{
                padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                border: "none", color: "white",
                boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
                opacity: saving || !form.reason || !form.oldDirection || !form.newDirection ? 0.6 : 1,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(239,68,68,0.45)" } }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 14px rgba(239,68,68,0.35)" }}
            >
              {saving ? "Enregistrement…" : "Documenter le pivot"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────
export function PivotTracker({ projectId, experimentCards, initialPivots = [] }: Props) {
  const [pivots, setPivots]       = useState<Pivot[]>(initialPivots)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [view, setView]           = useState<"tree" | "timeline">("tree")

  useEffect(() => {
    if (initialPivots.length === 0) {
      setLoading(true)
      fetch(`/api/projets/${projectId}/pivots`)
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setPivots(data) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [projectId, initialPivots.length])

  const rootPivots = pivots.filter(p => !p.parentPivotId)
  const flat: Pivot[] = []
  const flatten = (list: Pivot[]) => list.forEach(p => { flat.push(p); if (p.childPivots) flatten(p.childPivots) })
  flatten(pivots)
  const totalCount = flat.length

  const hasBudget   = flat.some(p => p.budgetImpact)
  const hasTimeline = flat.some(p => p.timelineImpact)

  function handleCreated(pivot: Pivot) {
    if (pivot.parentPivotId) {
      setPivots(prev => addChild(prev, pivot.parentPivotId!, { ...pivot, childPivots: [] }))
    } else {
      setPivots(prev => [{ ...pivot, childPivots: [] }, ...prev])
    }
  }

  function addChild(list: Pivot[], parentId: string, child: Pivot): Pivot[] {
    return list.map(p =>
      p.id === parentId
        ? { ...p, childPivots: [...(p.childPivots ?? []), child] }
        : { ...p, childPivots: addChild(p.childPivots ?? [], parentId, child) }
    )
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #0a0f1e, #0d1527)",
      border: "1px solid rgba(239,68,68,0.15)",
      borderRadius: 14, padding: "20px 24px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 12px rgba(239,68,68,0.15)",
          }}>
            <GitBranch size={15} color="#ef4444" />
          </div>
          <div>
            <h3 style={{ color: "white", fontSize: 15, fontWeight: 700, margin: 0 }}>Arbre de décision — Pivots R&D</h3>
            <p style={{ fontSize: 11, color: dark.sub, margin: 0 }}>Traçabilité de l'incertitude technologique · RS&DE / SR&ED</p>
          </div>
          {totalCount > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 11px", borderRadius: 10, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
              {totalCount} pivot{totalCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Toggle vue */}
          {totalCount > 0 && (
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 3 }}>
              {([["tree", Network, "Arbre"], ["timeline", LayoutList, "Timeline"]] as const).map(([v, Icon, label]) => (
                <button key={v} onClick={() => setView(v as any)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                    background: view === v ? "rgba(239,68,68,0.2)" : "transparent",
                    border: view === v ? "1px solid rgba(239,68,68,0.35)" : "1px solid transparent",
                    color: view === v ? "#fca5a5" : dark.sub, transition: "all 0.15s",
                  }}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setShowCreate(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5", fontSize: 12, fontWeight: 700, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "rgba(239,68,68,0.2)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(239,68,68,0.2)" }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.boxShadow = "" }}
          >
            <Plus size={13} /> Documenter un pivot
          </button>
        </div>
      </div>

      {/* Stats rapides */}
      {totalCount > 0 && (hasBudget || hasTimeline) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          {hasBudget && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <TrendingDown size={13} style={{ color: "#fbbf24" }} />
              <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 600 }}>{flat.filter(p => p.budgetImpact).length} impact{flat.filter(p => p.budgetImpact).length > 1 ? "s" : ""} budgétaire{flat.filter(p => p.budgetImpact).length > 1 ? "s" : ""}</span>
            </div>
          )}
          {hasTimeline && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <Clock size={13} style={{ color: "#60a5fa" }} />
              <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 600 }}>{flat.filter(p => p.timelineImpact).length} impact{flat.filter(p => p.timelineImpact).length > 1 ? "s" : ""} calendrier</span>
            </div>
          )}
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: dark.sub }}>Chargement…</div>
      ) : rootPivots.length === 0 ? (
        <div style={{ padding: "32px 24px", textAlign: "center", border: "1px dashed rgba(239,68,68,0.2)", borderRadius: 10, background: "rgba(239,68,68,0.02)" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <RefreshCw size={20} color="#ef4444" />
          </div>
          <p style={{ color: "white", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Aucun pivot documenté</p>
          <p style={{ color: dark.sub, fontSize: 12, maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
            Chaque fois qu'une hypothèse échoue, documentez le pivot ici. L'ARC exige des preuves d'incertitude technologique — un historique de pivots démontre votre démarche scientifique rigoureuse.
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 11, color: "#fca5a5", padding: "6px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20 }}>
            <AlertCircle size={11} /> Requis pour les demandes RS&DE / SR&ED
          </div>
        </div>
      ) : view === "tree" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {rootPivots.map(pivot => <PivotNode key={pivot.id} pivot={pivot} />)}
        </div>
      ) : (
        <TimelineView pivots={rootPivots} />
      )}

      <CreatePivotDialog
        open={showCreate} onClose={() => setShowCreate(false)}
        projectId={projectId} experimentCards={experimentCards}
        pivots={pivots} onCreated={handleCreated}
      />
    </div>
  )
}
