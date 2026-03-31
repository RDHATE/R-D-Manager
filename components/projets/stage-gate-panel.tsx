"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  CheckCircle2, XCircle, Clock, RefreshCw, ChevronRight,
  ClipboardCheck, Plus, Trash2, Calendar, CheckCheck, AlertCircle,
  Lightbulb, ScanSearch, Briefcase, FlaskConical, ShieldCheck, Rocket,
  type LucideIcon,
} from "lucide-react"

// ── Stades ────────────────────────────────────────────────────────────────────
const STAGES: { gate: number; label: string; sublabel: string; description: string; color: string; Icon: LucideIcon; criteria: { id: string; label: string }[] }[] = [
  {
    gate: 0, label: "Discovery", sublabel: "G0", description: "Génération et filtrage initial des idées.",
    color: "#8b5cf6", Icon: Lightbulb,
    criteria: [
      { id: "c0_1", label: "Alignement avec la stratégie R&D" },
      { id: "c0_2", label: "Opportunité de marché ou besoin technique identifié" },
      { id: "c0_3", label: "Ressources minimales disponibles pour l'investigation" },
      { id: "c0_4", label: "Pas de blocage IP connu" },
    ],
  },
  {
    gate: 1, label: "Scoping", sublabel: "G1", description: "Investigation rapide : faisabilité préliminaire.",
    color: "#6366f1", Icon: ScanSearch,
    criteria: [
      { id: "c1_1", label: "Faisabilité technique plausible" },
      { id: "c1_2", label: "Incertitudes technologiques majeures identifiées" },
      { id: "c1_3", label: "Équipe projet constituée" },
      { id: "c1_4", label: "Budget préliminaire approuvé" },
    ],
  },
  {
    gate: 2, label: "Business Case", sublabel: "G2", description: "Analyse approfondie et plan de projet.",
    color: "#3b82f6", Icon: Briefcase,
    criteria: [
      { id: "c2_1", label: "Cas d'affaires solide et approuvé" },
      { id: "c2_2", label: "Plan de projet RS&DE avec jalons clairs" },
      { id: "c2_3", label: "Hypothèses scientifiques documentées" },
      { id: "c2_4", label: "Risques techniques identifiés et mitigés" },
      { id: "c2_5", label: "Budget RS&DE alloué formellement" },
    ],
  },
  {
    gate: 3, label: "Développement", sublabel: "G3", description: "R&D active : expériences et prototypes.",
    color: "#06b6d4", Icon: FlaskConical,
    criteria: [
      { id: "c3_1", label: "Expériences clés réalisées et documentées" },
      { id: "c3_2", label: "Prototype fonctionnel développé" },
      { id: "c3_3", label: "Incertitudes technologiques majeures levées" },
      { id: "c3_4", label: "Journal de bord RS&DE à jour" },
      { id: "c3_5", label: "Résultats négatifs aussi documentés" },
    ],
  },
  {
    gate: 4, label: "Tests & Validation", sublabel: "G4", description: "Validation et qualification.",
    color: "#10b981", Icon: ShieldCheck,
    criteria: [
      { id: "c4_1", label: "Tests de validation complétés avec succès" },
      { id: "c4_2", label: "Critères d'acceptation RS&DE atteints" },
      { id: "c4_3", label: "Validation en environnement pertinent confirmée" },
      { id: "c4_4", label: "Données suffisantes pour la réclamation T661" },
      { id: "c4_5", label: "Aucune non-conformité majeure non résolue" },
    ],
  },
  {
    gate: 5, label: "Lancement", sublabel: "G5", description: "Déploiement et clôture RS&DE.",
    color: "#f59e0b", Icon: Rocket,
    criteria: [
      { id: "c5_1", label: "Produit/process prêt au déploiement commercial" },
      { id: "c5_2", label: "Dossier RS&DE complet archivé" },
      { id: "c5_3", label: "Réclamation T661 préparée ou soumise" },
      { id: "c5_4", label: "Leçons apprises documentées" },
      { id: "c5_5", label: "Transfert de connaissances effectué" },
    ],
  },
]

const DECISION_CONFIG = {
  GO:      { label: "GO",      color: "#10b981", bg: "rgba(16,185,129,0.12)",  icon: <CheckCircle2 size={13} /> },
  NO_GO:   { label: "NO-GO",   color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: <XCircle size={13} /> },
  HOLD:    { label: "HOLD",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: <Clock size={13} /> },
  RECYCLE: { label: "RECYCLE", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", icon: <RefreshCw size={13} /> },
}

type Deliverable = {
  id: string; gate: number; label: string; description: string | null
  completed: boolean; dueDate: string | null; completedAt: string | null; isCustom: boolean
}
type GateDecision = {
  id: string; gate: number; decision: keyof typeof DECISION_CONFIG
  criteria: { id: string; label: string; passed: boolean }[] | null
  notes: string | null; createdAt: string
}

// ── Composant principal ────────────────────────────────────────────────────────
export function StageGatePanel({ projectId }: { projectId: string }) {
  const [currentGate, setCurrentGate] = useState(0)
  const [decisions, setDecisions] = useState<GateDecision[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGate, setSelectedGate] = useState<number>(0)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [addDelOpen, setAddDelOpen] = useState(false)
  const [addDelGate, setAddDelGate] = useState(0)
  const [newDelLabel, setNewDelLabel] = useState("")
  const [newDelDate, setNewDelDate] = useState("")
  const [form, setForm] = useState<{ decision: keyof typeof DECISION_CONFIG; criteria: { id: string; label: string; passed: boolean }[]; notes: string }>({
    decision: "GO", criteria: [], notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [savingDel, setSavingDel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDel, setErrorDel] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/projets/${projectId}/stage-gate`)
      .then(r => r.json())
      .then(data => {
        if (data.currentGate !== undefined) { setCurrentGate(data.currentGate); setSelectedGate(data.currentGate) }
        if (data.gateDecisions) setDecisions(data.gateDecisions)
        if (data.gateDeliverables) setDeliverables(data.gateDeliverables)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  // Livrables par gate
  const delivsByGate = (gate: number) => deliverables.filter(d => d.gate === gate)
  const completionRate = (gate: number) => {
    const items = delivsByGate(gate)
    if (items.length === 0) return null
    const done = items.filter(d => d.completed).length
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) }
  }
  const isReadyForReview = (gate: number) => {
    const items = delivsByGate(gate)
    return items.length > 0 && items.every(d => d.completed)
  }

  // Toggle livrable complété
  const toggleDeliverable = async (deliv: Deliverable) => {
    const newVal = !deliv.completed
    setDeliverables(prev => prev.map(d => d.id === deliv.id ? { ...d, completed: newVal, completedAt: newVal ? new Date().toISOString() : null } : d))
    await fetch(`/api/projets/${projectId}/stage-gate/deliverables/${deliv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: newVal }),
    }).catch(() => {})
  }

  // Mise à jour date estimée
  const updateDueDate = async (delivId: string, dueDate: string) => {
    setDeliverables(prev => prev.map(d => d.id === delivId ? { ...d, dueDate: dueDate || null } : d))
    await fetch(`/api/projets/${projectId}/stage-gate/deliverables/${delivId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate: dueDate || null }),
    }).catch(() => {})
  }

  // Supprimer livrable personnalisé
  const deleteDeliverable = async (delivId: string) => {
    setDeliverables(prev => prev.filter(d => d.id !== delivId))
    await fetch(`/api/projets/${projectId}/stage-gate/deliverables/${delivId}`, { method: "DELETE" }).catch(() => {})
  }

  // Ajouter livrable personnalisé
  const handleAddDeliverable = async () => {
    if (!newDelLabel.trim()) return
    setSavingDel(true)
    setErrorDel(null)
    try {
      const res = await fetch(`/api/projets/${projectId}/stage-gate/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gate: addDelGate, label: newDelLabel, dueDate: newDelDate || null }),
      })
      if (res.ok) {
        const newDel = await res.json()
        setDeliverables(prev => [...prev, newDel])
        setNewDelLabel(""); setNewDelDate(""); setAddDelOpen(false)
      } else {
        const d = await res.json().catch(() => ({}))
        setErrorDel(d?.error ?? `Erreur ${res.status} — redémarrez le serveur dev si c'est la première fois`)
      }
    } catch {
      setErrorDel("Erreur réseau")
    } finally {
      setSavingDel(false)
    }
  }

  // Ouvrir revue gate
  const openReview = (gate: number) => {
    setForm({
      decision: "GO",
      criteria: STAGES[gate].criteria.map(c => ({ ...c, passed: false })),
      notes: "",
    })
    setError(null)
    setReviewOpen(true)
  }

  // Soumettre décision gate
  const handleSubmit = async () => {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/projets/${projectId}/stage-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gate: selectedGate, decision: form.decision, criteria: form.criteria, notes: form.notes }),
      })
      if (res.ok) {
        const data = await res.json()
        setDecisions(prev => [data.gateDecision, ...prev])
        if (data.nextGate !== null) {
          setCurrentGate(data.nextGate)
          setSelectedGate(data.nextGate)
        }
        if (data.newDeliverables?.length > 0) {
          setDeliverables(prev => [...prev, ...data.newDeliverables])
        }
        setReviewOpen(false)
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d?.error ?? `Erreur ${res.status}`)
      }
    } catch { setError("Erreur réseau") }
    finally { setSaving(false) }
  }

  const lastDecisionByGate = STAGES.reduce((acc, s) => {
    const last = decisions.find(d => d.gate === s.gate)
    if (last) acc[s.gate] = last
    return acc
  }, {} as Record<number, GateDecision>)

  if (loading) return <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>Chargement...</div>

  const activeStage = STAGES[selectedGate] ?? STAGES[0]
  const currentDeliv = delivsByGate(selectedGate)
  const nextDeliv = selectedGate < 5 ? delivsByGate(selectedGate + 1) : []
  const completion = completionRate(selectedGate)
  const ready = isReadyForReview(selectedGate)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Pipeline ── */}
      <div style={{ background: "#0f172a", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
          {STAGES.map((stage, idx) => {
            const lastDec = lastDecisionByGate[stage.gate]
            const isActive = stage.gate === selectedGate
            const isPast = stage.gate < currentGate
            const comp = completionRate(stage.gate)
            const decCfg = lastDec ? DECISION_CONFIG[lastDec.decision] : null

            return (
              <div key={stage.gate} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                <button
                  onClick={() => setSelectedGate(stage.gate)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "10px 14px", borderRadius: 10, minWidth: 100,
                    background: isActive ? `${stage.color}22` : isPast ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                    border: isActive ? `2px solid ${stage.color}` : `1px solid rgba(255,255,255,0.08)`,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${stage.color}20`
                    e.currentTarget.style.borderColor = stage.color
                    e.currentTarget.style.transform = "translateY(-2px)"
                    e.currentTarget.style.boxShadow = `0 6px 16px ${stage.color}35`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isActive ? `${stage.color}22` : isPast ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)"
                    e.currentTarget.style.borderColor = isActive ? stage.color : "rgba(255,255,255,0.08)"
                    e.currentTarget.style.transform = ""
                    e.currentTarget.style.boxShadow = isActive ? `0 4px 12px ${stage.color}25` : ""
                  }}
                >
                  <stage.Icon size={18} style={{ marginBottom: 4, color: isActive ? stage.color : isPast ? "#94a3b8" : "#475569" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? stage.color : "#475569", letterSpacing: 0.5 }}>{stage.sublabel}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? "white" : isPast ? "#94a3b8" : "#475569", textAlign: "center", marginTop: 2 }}>{stage.label}</span>
                  {/* Barre de progression livrables */}
                  {comp && (
                    <div style={{ width: "100%", marginTop: 6 }}>
                      <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${comp.pct}%`, background: comp.pct === 100 ? "#10b981" : stage.color, borderRadius: 3, transition: "width 0.3s" }} />
                      </div>
                      <span style={{ fontSize: 9, color: comp.pct === 100 ? "#10b981" : "#64748b", marginTop: 2, display: "block" }}>
                        {comp.done}/{comp.total}
                      </span>
                    </div>
                  )}
                  {decCfg && (
                    <span style={{ marginTop: 4, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: decCfg.bg, color: decCfg.color, border: `1px solid ${decCfg.color}33` }}>
                      {decCfg.label}
                    </span>
                  )}
                </button>
                {idx < STAGES.length - 1 && (
                  <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.15)", margin: "0 1px", flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Contenu du gate sélectionné ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Livrables du gate actuel */}
        <div style={{ background: "#0f172a", borderRadius: 12, padding: 16, border: `1px solid ${activeStage.color}22` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <p style={{ color: "#64748b", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
                {activeStage.sublabel} — Livrables à présenter
              </p>
              {completion && (
                <p style={{ fontSize: 12, color: completion.pct === 100 ? "#10b981" : "#94a3b8", marginTop: 2 }}>
                  {completion.done}/{completion.total} complétés
                </p>
              )}
            </div>
            <button
              onClick={() => { setAddDelGate(selectedGate); setAddDelOpen(true) }}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: `${activeStage.color}15`, border: `1px solid ${activeStage.color}33`, color: activeStage.color, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 4px 10px ${activeStage.color}40`; e.currentTarget.style.background = `${activeStage.color}28` }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.background = `${activeStage.color}15` }}
            >
              <Plus size={11} /> Ajouter
            </button>
          </div>

          {/* Indicateur readiness */}
          {ready ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", marginBottom: 12 }}>
              <CheckCheck size={14} style={{ color: "#10b981", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>Tous les livrables complétés — Prêt pour la revue de gate !</span>
            </div>
          ) : completion && completion.total > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", marginBottom: 12 }}>
              <AlertCircle size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#f59e0b" }}>
                {completion.total - completion.done} livrable{completion.total - completion.done > 1 ? "s" : ""} en attente avant la revue
              </span>
            </div>
          )}

          {currentDeliv.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#475569", fontSize: 12 }}>
              <p>Aucun livrable défini.</p>
              <p style={{ marginTop: 4 }}>Validez la gate précédente (GO) pour les générer automatiquement.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {currentDeliv.map(d => (
                <DeliverableRow
                  key={d.id}
                  deliv={d}
                  color={activeStage.color}
                  onToggle={() => toggleDeliverable(d)}
                  onDateChange={date => updateDueDate(d.id, date)}
                  onDelete={d.isCustom ? () => deleteDeliverable(d.id) : undefined}
                />
              ))}
            </div>
          )}

          {/* Bouton revue */}
          <Button
            onClick={() => openReview(selectedGate)}
            style={{
              marginTop: 14, width: "100%",
              background: ready ? `linear-gradient(135deg, ${activeStage.color}cc, ${activeStage.color})` : "rgba(255,255,255,0.07)",
              color: ready ? "white" : "#94a3b8",
              border: ready ? "none" : "1px solid rgba(255,255,255,0.12)",
              fontWeight: 700, fontSize: 13,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <ClipboardCheck size={14} />
            {ready ? `✓ Décision GO / NO-GO pour ${activeStage.sublabel}` : `Décision GO / NO-GO — ${activeStage.sublabel} (livrables en cours)`}
          </Button>
        </div>

        {/* Livrables gate suivante */}
        {selectedGate < 5 && (
          <div style={{ background: "#0f172a", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p style={{ color: "#64748b", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
                  {STAGES[selectedGate + 1].sublabel} — Prochains livrables
                </p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Livrables attendus pour la prochaine gate</p>
              </div>
              <button
                onClick={() => { setAddDelGate(selectedGate + 1); setAddDelOpen(true) }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#e2e8f0" }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#64748b" }}
              >
                <Plus size={11} /> Ajouter
              </button>
            </div>

            {nextDeliv.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#475569", fontSize: 12 }}>
                <p>Sera généré automatiquement</p>
                <p style={{ marginTop: 4 }}>lors de la décision GO pour {STAGES[selectedGate].sublabel}.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {nextDeliv.map(d => (
                  <DeliverableRow
                    key={d.id}
                    deliv={d}
                    color={STAGES[selectedGate + 1].color}
                    onToggle={() => toggleDeliverable(d)}
                    onDateChange={date => updateDueDate(d.id, date)}
                    onDelete={d.isCustom ? () => deleteDeliverable(d.id) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Funnel 3D ── */}
      <StageFunnel3D currentGate={currentGate} decisions={decisions} onSelectGate={setSelectedGate} />

      {/* ── Historique décisions ── */}
      {decisions.length > 0 && (
        <div style={{ background: "#0f172a", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ color: "#64748b", fontSize: 11, fontWeight: 600, marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>Historique des revues</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {decisions.map(d => {
              const stage = STAGES[d.gate]
              const decCfg = DECISION_CONFIG[d.decision]
              const passedCount = d.criteria?.filter(c => c.passed).length ?? 0
              const total = d.criteria?.length ?? 0
              return (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  {stage && <stage.Icon size={16} style={{ color: stage.color, flexShrink: 0 }} />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: "white", flex: 1 }}>{stage?.sublabel} — {stage?.label}</span>
                  {total > 0 && <span style={{ fontSize: 11, color: "#64748b" }}>{passedCount}/{total} critères</span>}
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: decCfg.bg, color: decCfg.color, border: `1px solid ${decCfg.color}33` }}>{decCfg.label}</span>
                  <span style={{ fontSize: 11, color: "#475569" }}>{new Date(d.createdAt).toLocaleDateString("fr-CA")}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Dialog revue gate ── */}
      <Dialog open={reviewOpen} onOpenChange={v => !v && setReviewOpen(false)}>
        <DialogContent style={{ background: "linear-gradient(135deg, #0a0f1e, #0d1527)", border: "1px solid rgba(255,255,255,0.1)", maxWidth: 540, maxHeight: "85vh", overflowY: "auto" }}>
          <DialogTitle style={{ color: "white", fontSize: 16, fontWeight: 700 }}>
            Revue {activeStage.sublabel} — {activeStage.label}
          </DialogTitle>
          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>{activeStage.description}</p>

          {/* Checklist */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Critères d'entrée</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {form.criteria.map(c => (
                <button key={c.id} onClick={() => setForm(f => ({ ...f, criteria: f.criteria.map(x => x.id === c.id ? { ...x, passed: !x.passed } : x) }))}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, textAlign: "left", background: c.passed ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)", border: c.passed ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = c.passed ? "0 4px 10px rgba(16,185,129,0.2)" : "0 4px 10px rgba(0,0,0,0.25)"; e.currentTarget.style.background = c.passed ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.07)" }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.background = c.passed ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, background: c.passed ? "#10b981" : "rgba(255,255,255,0.08)", border: c.passed ? "none" : "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c.passed && <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12, color: c.passed ? "#e2e8f0" : "#94a3b8" }}>{c.label}</span>
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>{form.criteria.filter(c => c.passed).length}/{form.criteria.length} critères satisfaits</p>
          </div>

          {/* Décision */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Décision du comité</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(Object.entries(DECISION_CONFIG) as [keyof typeof DECISION_CONFIG, (typeof DECISION_CONFIG)[keyof typeof DECISION_CONFIG]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, decision: key }))}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, cursor: "pointer", background: form.decision === key ? cfg.bg : "rgba(255,255,255,0.04)", border: form.decision === key ? `2px solid ${cfg.color}` : "1px solid rgba(255,255,255,0.1)", color: form.decision === key ? cfg.color : "#64748b", fontSize: 12, fontWeight: 700, transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 5px 14px ${cfg.color}35`; e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.color = cfg.color }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = form.decision === key ? `0 3px 8px ${cfg.color}25` : ""; e.currentTarget.style.borderColor = form.decision === key ? cfg.color : "rgba(255,255,255,0.1)"; e.currentTarget.style.color = form.decision === key ? cfg.color : "#64748b" }}>
                  {cfg.icon}{cfg.label}
                </button>
              ))}
            </div>
            {form.decision === "GO" && (
              <p style={{ fontSize: 11, color: "#10b981", marginTop: 6 }}>✓ Les livrables de la prochaine gate seront générés automatiquement.</p>
            )}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Notes</p>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observations, conditions, prochaines étapes..." rows={3}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", resize: "vertical" }} />
          </div>

          {error && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 12, marginBottom: 12 }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="ghost" onClick={() => setReviewOpen(false)} style={{ color: "#64748b" }}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saving}
              style={{ background: `linear-gradient(135deg, ${activeStage.color}cc, ${activeStage.color})`, color: "white", fontWeight: 700, border: "none" }}>
              {saving ? "Enregistrement..." : `${DECISION_CONFIG[form.decision].label} — ${activeStage.sublabel}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog ajouter livrable ── */}
      <Dialog open={addDelOpen} onOpenChange={v => !v && setAddDelOpen(false)}>
        <DialogContent style={{ background: "linear-gradient(135deg, #0a0f1e, #0d1527)", border: "1px solid rgba(255,255,255,0.1)", maxWidth: 420 }}>
          <DialogTitle style={{ color: "white", fontSize: 15, fontWeight: 700 }}>
            Ajouter un livrable — {STAGES[addDelGate]?.sublabel}
          </DialogTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 5 }}>Livrable *</label>
              <Input value={newDelLabel} onChange={e => setNewDelLabel(e.target.value)} placeholder="Ex: Rapport de validation des tests..."
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 5 }}>Date estimée</label>
              <Input type="date" value={newDelDate} onChange={e => setNewDelDate(e.target.value)}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
            {errorDel && (
              <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 12 }}>
                {errorDel}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
              <Button variant="ghost" onClick={() => setAddDelOpen(false)} style={{ color: "#64748b" }}>Annuler</Button>
              <Button onClick={handleAddDeliverable} disabled={!newDelLabel.trim() || savingDel}
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "white", fontWeight: 700, border: "none" }}>
                {savingDel ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Funnel 3D ─────────────────────────────────────────────────────────────────
function StageFunnel3D({
  currentGate, decisions, onSelectGate,
}: {
  currentGate: number; decisions: GateDecision[]; onSelectGate: (gate: number) => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [pressed, setPressed] = useState<number | null>(null)

  const lastDecisionByGate: Record<number, GateDecision> = {}
  decisions.forEach(d => { if (!lastDecisionByGate[d.gate]) lastDecisionByGate[d.gate] = d })

  const DESC = [
    "Génération et filtrage initial des idées",
    "Investigation rapide : faisabilité préliminaire",
    "Analyse approfondie et plan de projet",
    "R&D active : expériences et prototypes",
    "Validation et qualification des résultats",
    "Déploiement commercial et clôture RS&DE",
  ]

  return (
    <div style={{ background: "#0a0f1e", borderRadius: 14, padding: "22px 24px 28px", border: "1px solid rgba(255,255,255,0.08)" }}>
      <p style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, marginBottom: 24, letterSpacing: 1.2, textTransform: "uppercase" }}>
        Progression du pipeline Stage-Gate
      </p>

      <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>

        {/* ── Panneau gauche descriptions ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, flexShrink: 0, width: 190 }}>
          {STAGES.map((stage, idx) => {
            const isActive = stage.gate === currentGate
            const isPast = stage.gate < currentGate
            const isHov = hovered === stage.gate
            const ROW_H = 60
            return (
              <div key={stage.gate} style={{
                height: ROW_H,
                display: "flex", alignItems: "center",
                paddingRight: 18,
                borderRight: `2px solid ${isPast || isActive || isHov ? stage.color + "70" : "rgba(255,255,255,0.07)"}`,
                position: "relative",
                transition: "border-color 0.2s",
              }}>
                <div style={{
                  position: "absolute", right: -1, top: "50%",
                  width: 18, height: 2,
                  background: isPast || isActive || isHov ? stage.color : "rgba(255,255,255,0.07)",
                  transform: "translateY(-50%)",
                  transition: "background 0.2s",
                }} />
                <p style={{
                  fontSize: 11.5,
                  color: isActive ? "#f1f5f9" : isPast ? "#cbd5e1" : isHov ? "#94a3b8" : "#475569",
                  lineHeight: 1.45,
                  textAlign: "right",
                  fontWeight: isActive ? 600 : isPast ? 500 : 400,
                  transition: "color 0.2s",
                }}>
                  {DESC[idx]}
                </p>
              </div>
            )
          })}
        </div>

        {/* ── Funnel 3D ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{
            width: "100%",
            transform: "perspective(800px) rotateX(16deg)",
            transformOrigin: "center bottom",
            transformStyle: "preserve-3d",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
          }}>
            {STAGES.map((stage, idx) => {
              const isActive = stage.gate === currentGate
              const isPast = stage.gate < currentGate
              const isHov = hovered === stage.gate
              const isPress = pressed === stage.gate
              const lastDec = lastDecisionByGate[stage.gate]
              const decCfg = lastDec ? DECISION_CONFIG[lastDec.decision] : null
              const widthPct = 100 - idx * 8.5

              // Élévation 3D selon l'état
              const lift = isPress ? 2 : isHov ? -10 : 0

              return (
                <div key={stage.gate} style={{
                  width: `${widthPct}%`, marginBottom: 5,
                  transform: `translateY(${lift}px)`,
                  transition: "transform 0.18s cubic-bezier(.34,1.56,.64,1)",
                  cursor: "pointer",
                  position: "relative",
                }}
                  onClick={() => { setPressed(stage.gate); onSelectGate(stage.gate); setTimeout(() => setPressed(null), 200) }}
                  onMouseEnter={() => setHovered(stage.gate)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Face principale */}
                  <div style={{
                    height: 54,
                    borderRadius: 9,
                    background: isPast
                      ? `linear-gradient(160deg, ${stage.color}ee 0%, ${stage.color}bb 100%)`
                      : isActive
                      ? `linear-gradient(160deg, ${stage.color} 0%, ${stage.color}dd 100%)`
                      : isHov
                      ? "linear-gradient(160deg, #253449 0%, #1a2840 100%)"
                      : "linear-gradient(160deg, #1c2d3e 0%, #131f2e 100%)",
                    border: isActive
                      ? `2px solid ${stage.color}`
                      : isPast
                      ? `1px solid ${stage.color}88`
                      : isHov
                      ? `1px solid ${stage.color}55`
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: isHov
                      ? `0 -8px 28px ${stage.color}60, 0 4px 0 ${stage.color}30, inset 0 1px 0 rgba(255,255,255,0.3)`
                      : isActive
                      ? `0 0 22px ${stage.color}50, inset 0 1px 0 rgba(255,255,255,0.25)`
                      : isPast
                      ? `0 3px 10px ${stage.color}25, inset 0 1px 0 rgba(255,255,255,0.15)`
                      : "inset 0 1px 0 rgba(255,255,255,0.05)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0 16px",
                    transition: "all 0.18s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Icône */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: isPast || isActive
                          ? "rgba(255,255,255,0.18)"
                          : isHov ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: isPast || isActive ? "inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.3)" : "none",
                        flexShrink: 0,
                        transition: "all 0.18s",
                      }}>
                        <stage.Icon size={15} style={{ color: isPast || isActive ? "white" : isHov ? stage.color : "#4a6080" }} />
                      </div>
                      {/* Textes */}
                      <div>
                        <span style={{
                          fontSize: 10, fontWeight: 800, letterSpacing: 1,
                          color: isPast || isActive ? "rgba(255,255,255,0.75)" : isHov ? stage.color : "#4a6080",
                          display: "block", marginBottom: 1,
                          textShadow: isPast || isActive ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
                          transition: "color 0.18s",
                        }}>
                          {stage.sublabel}
                        </span>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: isPast || isActive ? "white" : isHov ? "#cbd5e1" : "#64748b",
                          textShadow: isPast || isActive ? "0 1px 4px rgba(0,0,0,0.5)" : "none",
                          transition: "color 0.18s",
                        }}>
                          {stage.label}
                        </span>
                      </div>
                    </div>
                    {/* Badges droite */}
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      {isActive && (
                        <span style={{
                          fontSize: 9, fontWeight: 800,
                          color: "white",
                          padding: "3px 9px", borderRadius: 10,
                          background: `${stage.color}cc`,
                          border: "1px solid rgba(255,255,255,0.3)",
                          letterSpacing: 0.6,
                          textShadow: "none",
                          boxShadow: `0 2px 8px ${stage.color}60`,
                        }}>● EN COURS</span>
                      )}
                      {decCfg && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 10,
                          background: decCfg.bg, color: decCfg.color,
                          border: `1px solid ${decCfg.color}55`,
                          boxShadow: `0 2px 6px ${decCfg.color}30`,
                        }}>{decCfg.label}</span>
                      )}
                    </div>
                  </div>

                  {/* Tranche inférieure (épaisseur 3D) */}
                  <div style={{
                    height: isHov ? 12 : 8,
                    borderRadius: "0 0 9px 9px",
                    background: isPast
                      ? `linear-gradient(180deg, ${stage.color}66, ${stage.color}22)`
                      : isActive
                      ? `linear-gradient(180deg, ${stage.color}55, ${stage.color}18)`
                      : isHov
                      ? `linear-gradient(180deg, ${stage.color}33, transparent)`
                      : "linear-gradient(180deg, rgba(255,255,255,0.05), transparent)",
                    marginTop: -2,
                    transition: "height 0.18s",
                  }} />
                </div>
              )
            })}
          </div>

          {/* Barre de progression */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 20 }}>
            {STAGES.map(stage => (
              <div key={stage.gate} style={{
                height: 5, borderRadius: 3,
                width: stage.gate < currentGate ? 30 : stage.gate === currentGate ? 22 : 10,
                background: stage.gate <= currentGate ? stage.color : "rgba(255,255,255,0.07)",
                opacity: stage.gate < currentGate ? 0.75 : stage.gate === currentGate ? 1 : 0.35,
                boxShadow: stage.gate === currentGate ? `0 0 10px ${stage.color}90` : "none",
                transition: "all 0.3s",
              }} />
            ))}
            <span style={{ fontSize: 11, color: "#64748b", marginLeft: 10, fontWeight: 600 }}>
              {currentGate} / 5 gates franchis
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Ligne de livrable ─────────────────────────────────────────────────────────
function DeliverableRow({ deliv, color, onToggle, onDateChange, onDelete }: {
  deliv: Deliverable
  color: string
  onToggle: () => void
  onDateChange: (date: string) => void
  onDelete?: () => void
}) {
  const isOverdue = deliv.dueDate && !deliv.completed && new Date(deliv.dueDate) < new Date()

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8,
        background: deliv.completed ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.03)",
        border: deliv.completed ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.06)",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = deliv.completed ? "0 4px 10px rgba(16,185,129,0.15)" : "0 4px 10px rgba(0,0,0,0.25)"; e.currentTarget.style.background = deliv.completed ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.06)" }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.background = deliv.completed ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.03)" }}
    >
      {/* Checkbox */}
      <button onClick={onToggle} style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: "pointer",
        background: deliv.completed ? "#10b981" : "rgba(255,255,255,0.08)",
        border: deliv.completed ? "none" : `1px solid rgba(255,255,255,0.2)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.boxShadow = deliv.completed ? "0 2px 6px rgba(16,185,129,0.4)" : "0 2px 6px rgba(255,255,255,0.15)" }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}
      >
        {deliv.completed && <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>✓</span>}
      </button>

      {/* Label */}
      <span style={{
        flex: 1, fontSize: 12, color: deliv.completed ? "#64748b" : "#e2e8f0",
        textDecoration: deliv.completed ? "line-through" : "none",
        lineHeight: 1.4,
      }}>
        {deliv.label}
        {deliv.isCustom && <span style={{ marginLeft: 5, fontSize: 9, color: color, fontWeight: 700 }}>CUSTOM</span>}
      </span>

      {/* Date estimée */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <Calendar size={11} style={{ color: isOverdue ? "#ef4444" : "#475569" }} />
        <input
          type="date"
          value={deliv.dueDate ? deliv.dueDate.split("T")[0] : ""}
          onChange={e => onDateChange(e.target.value)}
          style={{
            background: "none", border: "none", outline: "none",
            color: isOverdue ? "#ef4444" : "#64748b",
            fontSize: 11, cursor: "pointer", width: 95,
          }}
        />
      </div>

      {/* Supprimer (custom seulement) */}
      {onDelete && (
        <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 2, flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={e => (e.currentTarget.style.color = "#475569")}>
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}
