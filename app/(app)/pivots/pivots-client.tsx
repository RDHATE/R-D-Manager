"use client"
import { useThemeColors } from "@/hooks/use-theme-colors"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  RefreshCw, Plus, ChevronDown, ChevronRight, Calendar, User,
  AlertCircle, Lightbulb, DollarSign, Clock, ArrowRight,
  GitBranch, LayoutList, Network, TrendingDown, Filter,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────
type Pivot = {
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

type Project = { id: string; name: string; code: string }

interface Props {
  pivots: Pivot[]
  projects: Project[]
}


// ── Nœud arbre ────────────────────────────────────────────────────────────────
function PivotNode({ pivot, depth = 0, isLast = true }: { pivot: Pivot; depth?: number; isLast?: boolean }) {
  const dark = useThemeColors()
  const [collapsed, setCollapsed] = useState(false)
  const hasChildren = pivot.childPivots?.length > 0
  const date = new Date(pivot.createdAt).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" })
  const hasImpact = pivot.budgetImpact || pivot.timelineImpact

  return (
    <div style={{ position: "relative" }}>
      {depth > 0 && (
        <div style={{ position: "absolute", left: -24, top: 0, bottom: isLast ? "50%" : 0, width: 2, background: "rgba(239,68,68,0.25)" }} />
      )}
      {depth > 0 && (
        <div style={{ position: "absolute", left: -24, top: 22, width: 20, height: 2, background: "rgba(239,68,68,0.25)" }} />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0, marginTop: 4,
          background: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 12px rgba(239,68,68,0.15)",
        }}>
          <RefreshCw size={14} color="#ef4444" />
        </div>

        <div style={{
          flex: 1, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)",
          borderRadius: 12, overflow: "hidden", transition: "all 0.15s", cursor: "default",
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
          <div style={{ height: 3, background: "linear-gradient(90deg, #ef4444, #ef444444)" }} />

          <div style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: dark.sub }}>
                <Calendar size={11} /> {date}
              </span>
              {pivot.createdBy && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: dark.sub }}>
                  <User size={11} /> {pivot.createdBy.name}
                </span>
              )}
              {pivot.project && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                  background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8",
                }}>
                  {pivot.project.code} · {pivot.project.name}
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
            </div>

            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Raison de l'échec</p>
              <p style={{ fontSize: 13, color: dark.text2, lineHeight: 1.5 }}>{pivot.reason}</p>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8,
              background: dark.surface, border: `1px solid ${dark.border}`,
              marginBottom: hasImpact || pivot.lessons ? 10 : 0,
            }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Ancienne direction</p>
                <p style={{ fontSize: 12, color: dark.sub, textDecoration: "line-through", lineHeight: 1.5 }}>{pivot.oldDirection}</p>
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
                <p style={{ fontSize: 12, color: "#059669", fontWeight: 600, lineHeight: 1.5 }}>{pivot.newDirection}</p>
              </div>
            </div>

            {pivot.lessons && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "8px 10px", borderRadius: 8, marginBottom: 8,
                background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
              }}>
                <Lightbulb size={13} style={{ color: "#10b981", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: dark.text2, lineHeight: 1.5 }}><strong>Leçons :</strong> {pivot.lessons}</p>
              </div>
            )}

            {hasImpact && (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {pivot.budgetImpact && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}>
                    <DollarSign size={11} /> {pivot.budgetImpact}
                  </span>
                )}
                {pivot.timelineImpact && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 10, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa" }}>
                    <Clock size={11} /> {pivot.timelineImpact}
                  </span>
                )}
              </div>
            )}

            {hasChildren && (
              <button onClick={() => setCollapsed(!collapsed)} style={{
                display: "flex", alignItems: "center", gap: 5,
                marginTop: 10, fontSize: 11, fontWeight: 600, color: dark.sub,
                background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                onMouseLeave={e => (e.currentTarget.style.color = dark.sub)}
              >
                {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                {pivot.childPivots.length} pivot{pivot.childPivots.length > 1 ? "s" : ""} dérivé{pivot.childPivots.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      </div>

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
  const dark = useThemeColors()
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
              <div style={{ position: "absolute", left: -22, top: 14, width: 12, height: 12, borderRadius: "50%", background: "#ef4444", border: `2px solid ${dark.bg}`, boxShadow: "0 0 8px rgba(239,68,68,0.5)" }} />
              <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: "10px 14px", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(239,68,68,0.12)" }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444" }}>Pivot #{i + 1}</span>
                  <span style={{ fontSize: 10, color: dark.sub }}>{date}</span>
                  {p.createdBy && <span style={{ fontSize: 10, color: dark.sub }}>· {p.createdBy.name}</span>}
                  {p.project && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 8, background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>{p.project.code}</span>}
                  {p.experimentCard && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 8, background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>{p.experimentCard.title}</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                  <p style={{ fontSize: 11, color: dark.sub, textDecoration: "line-through" }}>{p.oldDirection}</p>
                  <ArrowRight size={12} color="#ef4444" />
                  <p style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>{p.newDirection}</p>
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
function CreatePivotDialog({ open, onClose, projects, allPivots, onCreated }: {
  open: boolean; onClose: () => void
  projects: Project[]; allPivots: Pivot[]
  onCreated: (p: Pivot, parentId: string | null, projectId: string) => void
}) {
  const dark = useThemeColors()
  const [form, setForm] = useState({
    projectId: "", experimentCardId: "", reason: "", oldDirection: "", newDirection: "",
    lessons: "", budgetImpact: "", timelineImpact: "", parentPivotId: "",
  })
  const [experimentCards, setExperimentCards] = useState<{ id: string; title: string; status: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  // Load experiment cards when project changes
  useEffect(() => {
    if (!form.projectId) { setExperimentCards([]); return }
    fetch(`/api/projets/${form.projectId}/experiment-cards`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setExperimentCards(data) })
      .catch(() => {})
  }, [form.projectId])

  const flat: Pivot[] = []
  const flatten = (list: Pivot[]) => list.forEach(p => { flat.push(p); if (p.childPivots) flatten(p.childPivots) })
  // Only flatten pivots of the selected project
  flatten(allPivots.filter(p => !form.projectId || p.project?.id === form.projectId))

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  function handleClose() {
    setForm({ projectId: "", experimentCardId: "", reason: "", oldDirection: "", newDirection: "", lessons: "", budgetImpact: "", timelineImpact: "", parentPivotId: "" })
    setError(""); onClose()
  }

  async function handleSubmit() {
    if (!form.projectId) { setError("Veuillez sélectionner un projet."); return }
    if (!form.reason || !form.oldDirection || !form.newDirection) { setError("Les 3 champs marqués * sont requis."); return }
    setSaving(true); setError("")
    try {
      const body: Record<string, string> = {
        reason: form.reason, oldDirection: form.oldDirection, newDirection: form.newDirection,
      }
      if (form.experimentCardId) body.experimentCardId = form.experimentCardId
      if (form.lessons)          body.lessons          = form.lessons
      if (form.budgetImpact)     body.budgetImpact     = form.budgetImpact
      if (form.timelineImpact)   body.timelineImpact   = form.timelineImpact
      if (form.parentPivotId && form.parentPivotId !== "none")    body.parentPivotId    = form.parentPivotId

      const res = await fetch(`/api/projets/${form.projectId}/pivots`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        onCreated(data, (form.parentPivotId && form.parentPivotId !== "none") ? form.parentPivotId : null, form.projectId)
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
        border: "1px solid rgba(239,68,68,0.2)", maxWidth: 600, maxHeight: "90vh", overflowY: "auto",
      }}>
        <DialogTitle style={{ color: dark.text, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={13} color="#ef4444" />
          </div>
          Documenter un pivot R&D
        </DialogTitle>
        <p style={{ fontSize: 12, color: dark.sub, marginBottom: 16, lineHeight: 1.6 }}>
          Chaque pivot documenté est une preuve d'incertitude technologique valide pour les crédits RS&DE / SR&ED.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {/* Projet */}
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

          {/* Expérience liée */}
          {experimentCards.length > 0 && (
            <div>
              <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Expérience concernée</label>
              <Select value={form.experimentCardId} onValueChange={v => set("experimentCardId", v)}>
                <SelectTrigger style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text }}>
                  <SelectValue placeholder="Sélectionner une expérience…" />
                </SelectTrigger>
                <SelectContent>
                  {experimentCards.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Raison */}
          <div>
            <label style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Raison de l'échec *</label>
            <Textarea rows={2} value={form.reason} onChange={e => set("reason", e.target.value)}
              placeholder="Décrivez pourquoi l'hypothèse initiale n'a pas été validée…"
              style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, resize: "vertical" }} />
          </div>

          {/* Avant / Après */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Ancienne direction *</label>
              <Textarea rows={2} value={form.oldDirection} onChange={e => set("oldDirection", e.target.value)}
                placeholder="Hypothèse initiale abandonnée…"
                style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, resize: "vertical" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#10b981", fontWeight: 700, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Nouvelle direction *</label>
              <Textarea rows={2} value={form.newDirection} onChange={e => set("newDirection", e.target.value)}
                placeholder="Nouvelle hypothèse ou approche…"
                style={{ background: dark.card, border: "1px solid rgba(16,185,129,0.15)", color: dark.text, resize: "vertical" }} />
            </div>
          </div>

          {/* Leçons */}
          <div>
            <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Lightbulb size={11} /> Leçons scientifiques</span>
            </label>
            <Textarea rows={2} value={form.lessons} onChange={e => set("lessons", e.target.value)}
              placeholder="Qu'avez-vous appris de cette expérience ?"
              style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text, resize: "vertical" }} />
          </div>

          {/* Impacts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "#fbbf24", fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><DollarSign size={11} /> Impact budgétaire</span>
              </label>
              <Input value={form.budgetImpact} onChange={e => set("budgetImpact", e.target.value)}
                placeholder="ex: +15 000 $"
                style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#60a5fa", fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={11} /> Impact calendrier</span>
              </label>
              <Input value={form.timelineImpact} onChange={e => set("timelineImpact", e.target.value)}
                placeholder="ex: +3 semaines"
                style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text }} />
            </div>
          </div>

          {/* Pivot parent */}
          {flat.length > 0 && (
            <div>
              <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Dérivé d'un pivot précédent</label>
              <Select value={form.parentPivotId || "none"} onValueChange={v => set("parentPivotId", v)}>
                <SelectTrigger style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text }}>
                  <SelectValue placeholder="Aucun pivot parent…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {flat.map(p => <SelectItem key={p.id} value={p.id}>{p.newDirection.substring(0, 55)}…</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 12 }}>{error}</div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
            <button onClick={handleClose} style={{ padding: "9px 16px", borderRadius: 8, background: dark.input, border: `1px solid ${dark.border}`, color: dark.sub, fontSize: 13, cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={saving || !form.projectId || !form.reason || !form.oldDirection || !form.newDirection}
              style={{
                padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                background: "linear-gradient(135deg, #ef4444, #dc2626)", border: "none", color: "white",
                boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
                opacity: saving || !form.projectId || !form.reason || !form.oldDirection || !form.newDirection ? 0.6 : 1,
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
export function PivotsClient({ pivots: initialPivots, projects }: Props) {
  const dark = useThemeColors()
  const [pivots, setPivots]         = useState<Pivot[]>(initialPivots)
  const [filterProject, setFilter]  = useState<string>("all")
  const [showCreate, setShowCreate] = useState(false)
  const [view, setView]             = useState<"tree" | "timeline">("tree")

  const filtered = filterProject === "all" ? pivots : pivots.filter(p => p.project?.id === filterProject)

  const flat: Pivot[] = []
  const flatten = (list: Pivot[]) => list.forEach(p => { flat.push(p); if (p.childPivots) flatten(p.childPivots) })
  flatten(pivots)
  const totalCount = flat.length

  const hasBudget   = flat.some(p => p.budgetImpact)
  const hasTimeline = flat.some(p => p.timelineImpact)

  function addChild(list: Pivot[], parentId: string, child: Pivot): Pivot[] {
    return list.map(p =>
      p.id === parentId
        ? { ...p, childPivots: [...(p.childPivots ?? []), child] }
        : { ...p, childPivots: addChild(p.childPivots ?? [], parentId, child) }
    )
  }

  function handleCreated(pivot: Pivot, parentId: string | null, projectId: string) {
    const proj = projects.find(p => p.id === projectId)
    const full = { ...pivot, childPivots: [], project: proj }
    if (parentId) {
      setPivots(prev => addChild(prev, parentId, full))
    } else {
      setPivots(prev => [full, ...prev])
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: dark.bg, padding: "0 0 60px" }}>
      {/* Header page */}
      <div style={{
        background: dark.panel,
        borderBottom: "1px solid rgba(239,68,68,0.15)",
        padding: "28px 32px 24px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Titre */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 18px rgba(239,68,68,0.2)",
              }}>
                <GitBranch size={20} color="#ef4444" />
              </div>
              <div>
                <h1 style={{ color: dark.text, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>Pivots R&D</h1>
                <p style={{ fontSize: 13, color: dark.sub, margin: 0, marginTop: 2 }}>
                  Arbre de décision · Traçabilité de l'incertitude technologique · RS&DE / SR&ED
                </p>
              </div>
              {totalCount > 0 && (
                <span style={{
                  fontSize: 13, fontWeight: 700, padding: "4px 14px", borderRadius: 20,
                  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444",
                }}>
                  {totalCount} pivot{totalCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <button onClick={() => setShowCreate(true)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, cursor: "pointer",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              border: "none", color: "#fff",
              fontSize: 13, fontWeight: 700, transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(239,68,68,0.25)"; e.currentTarget.style.background = "rgba(239,68,68,0.22)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.background = "linear-gradient(135deg, #ef4444, #dc2626)" }}
            >
              <Plus size={15} /> Documenter un pivot
            </button>
          </div>

          {/* Stats rapides */}
          {totalCount > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ padding: "6px 14px", borderRadius: 8, background: dark.card, border: `1px solid ${dark.border}` }}>
                <span style={{ fontSize: 11, color: dark.sub }}>{projects.length} projet{projects.length > 1 ? "s" : ""} actif{projects.length > 1 ? "s" : ""}</span>
              </div>
              {hasBudget && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <TrendingDown size={12} style={{ color: "#fbbf24" }} />
                  <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 600 }}>{flat.filter(p => p.budgetImpact).length} impact{flat.filter(p => p.budgetImpact).length > 1 ? "s" : ""} budgétaire{flat.filter(p => p.budgetImpact).length > 1 ? "s" : ""}</span>
                </div>
              )}
              {hasTimeline && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
                  <Clock size={12} style={{ color: "#60a5fa" }} />
                  <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 600 }}>{flat.filter(p => p.timelineImpact).length} impact{flat.filter(p => p.timelineImpact).length > 1 ? "s" : ""} calendrier</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar filtres + vues */}
      <div style={{ background: dark.bg, borderBottom: `1px solid ${dark.border}`, padding: "12px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Filtre projet */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={13} color="#64748b" />
            <select
              value={filterProject}
              onChange={e => setFilter(e.target.value)}
              style={{
                background: dark.input, border: `1px solid ${dark.border}`,
                borderRadius: 7, color: dark.text, fontSize: 12, padding: "5px 10px",
                cursor: "pointer", outline: "none",
              }}
            >
              <option value="all">Tous les projets</option>
              {projects.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
            </select>
          </div>

          {/* Toggle vue */}
          {totalCount > 0 && (
            <div style={{ display: "flex", gap: 4, background: dark.card, borderRadius: 8, padding: 3 }}>
              {([["tree", Network, "Arbre"], ["timeline", LayoutList, "Timeline"]] as const).map(([v, Icon, label]) => (
                <button key={v} onClick={() => setView(v as "tree" | "timeline")}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                    background: view === v ? "rgba(239,68,68,0.2)" : "transparent",
                    border: view === v ? "1px solid rgba(239,68,68,0.35)" : "1px solid transparent",
                    color: view === v ? "#ef4444" : dark.sub, transition: "all 0.15s",
                  }}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", border: "1px dashed rgba(239,68,68,0.2)", borderRadius: 14, background: "rgba(239,68,68,0.02)" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <RefreshCw size={22} color="#ef4444" />
            </div>
            <p style={{ color: dark.text, fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Aucun pivot documenté</p>
            <p style={{ color: dark.sub, fontSize: 13, maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
              Chaque fois qu'une hypothèse échoue, documentez le pivot ici. L'ARC exige des preuves d'incertitude technologique — un historique de pivots démontre votre démarche scientifique rigoureuse.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, fontSize: 11, color: "#ef4444", padding: "7px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20 }}>
              <AlertCircle size={11} /> Requis pour les demandes RS&DE / SR&ED
            </div>
          </div>
        ) : view === "tree" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(pivot => <PivotNode key={pivot.id} pivot={pivot} />)}
          </div>
        ) : (
          <TimelineView pivots={filtered} />
        )}
      </div>

      <CreatePivotDialog
        open={showCreate} onClose={() => setShowCreate(false)}
        projects={projects} allPivots={pivots}
        onCreated={(p, parentId, projectId) => handleCreated(p, parentId, projectId)}
      />
    </div>
  )
}
