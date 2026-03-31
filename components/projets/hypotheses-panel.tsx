"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, GitBranch, Archive, AlertTriangle, ChevronDown, ChevronUp, Lightbulb } from "lucide-react"

type Hypothesis = {
  id: string
  version: number
  title: string
  description: string
  status: "ACTIVE" | "ARCHIVED" | "ABANDONED"
  pivotReason: string | null
  createdAt: string
}

interface Props {
  projectId: string
  hypotheses: Hypothesis[]
}

const STATUS_CONFIG = {
  ACTIVE:   { label: "Active",   color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ARCHIVED: { label: "Archivée", color: "bg-slate-100 text-slate-500 border-slate-200" },
  ABANDONED:{ label: "Pivot",    color: "bg-amber-100 text-amber-700 border-amber-200" },
}

export function HypothesesPanel({ projectId, hypotheses: initial }: Props) {
  const router = useRouter()
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>(initial)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: "", description: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Pivot dialog state
  const [pivotTarget, setPivotTarget] = useState<Hypothesis | null>(null)
  const [pivotReason, setPivotReason] = useState("")
  const [pivotLoading, setPivotLoading] = useState(false)

  // New version dialog — which hypothesis are we replacing?
  const [newVersionFrom, setNewVersionFrom] = useState<Hypothesis | null>(null)
  const [newVersionForm, setNewVersionForm] = useState({ title: "", description: "" })
  const [newVersionLoading, setNewVersionLoading] = useState(false)
  const [newVersionError, setNewVersionError] = useState("")

  const active   = hypotheses.filter(h => h.status === "ACTIVE")
  const archived = hypotheses.filter(h => h.status === "ARCHIVED")
  const abandoned= hypotheses.filter(h => h.status === "ABANDONED")

  async function handleCreate() {
    if (!form.title.trim() || !form.description.trim()) {
      setError("Titre et description requis."); return
    }
    setLoading(true); setError("")
    const res = await fetch(`/api/projets/${projectId}/hypotheses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, description: form.description }),
    })
    if (!res.ok) { setError((await res.json()).error ?? "Erreur"); setLoading(false); return }
    const created = await res.json()
    setHypotheses(prev => [created, ...prev])
    setForm({ title: "", description: "" })
    setShowNew(false)
    setLoading(false)
    router.refresh()
  }

  async function handleNewVersion() {
    if (!newVersionForm.title.trim() || !newVersionForm.description.trim()) {
      setNewVersionError("Titre et description requis."); return
    }
    setNewVersionLoading(true); setNewVersionError("")
    const res = await fetch(`/api/projets/${projectId}/hypotheses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newVersionForm.title,
        description: newVersionForm.description,
        archivePreviousId: newVersionFrom?.id,
      }),
    })
    if (!res.ok) { setNewVersionError((await res.json()).error ?? "Erreur"); setNewVersionLoading(false); return }
    const created = await res.json()
    // Update local state: archive the old one
    setHypotheses(prev => [
      created,
      ...prev.map(h => h.id === newVersionFrom?.id ? { ...h, status: "ARCHIVED" as const } : h),
    ])
    setNewVersionFrom(null)
    setNewVersionForm({ title: "", description: "" })
    setNewVersionLoading(false)
    router.refresh()
  }

  async function handlePivot() {
    if (!pivotTarget || !pivotReason.trim()) return
    setPivotLoading(true)
    const res = await fetch(`/api/projets/${projectId}/hypotheses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Nouvelle direction (suite pivot v${pivotTarget.version})`,
        description: "À définir…",
        archivePreviousId: pivotTarget.id,
        pivotReason,
      }),
    })
    if (!res.ok) { setPivotLoading(false); return }
    const created = await res.json()
    setHypotheses(prev => [
      created,
      ...prev.map(h => h.id === pivotTarget.id ? { ...h, status: "ABANDONED" as const, pivotReason } : h),
    ])
    setPivotTarget(null)
    setPivotReason("")
    setPivotLoading(false)
    router.refresh()
  }

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {active.length} hypothèse{active.length !== 1 ? "s" : ""} active{active.length !== 1 ? "s" : ""}
            {archived.length > 0 && ` · ${archived.length} archivée${archived.length !== 1 ? "s" : ""}`}
            {abandoned.length > 0 && ` · ${abandoned.length} pivot${abandoned.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Nouvelle hypothèse
        </Button>
      </div>

      {/* Formulaire nouvelle hypothèse */}
      {showNew && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-medium">Nouvelle hypothèse</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Titre</Label>
              <Input
                placeholder="Ex: L'algorithme X réduit la latence de 40%"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                placeholder="Décrivez l'hypothèse, la base scientifique, ce qu'elle cherche à prouver…"
                rows={3}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={loading}>
                {loading ? "Création…" : "Créer"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowNew(false); setError("") }}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aucune hypothèse */}
      {hypotheses.length === 0 && !showNew && (
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">Aucune hypothèse définie.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les hypothèses RS&DE sont au cœur de la documentation ARC.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Hypothèses actives */}
      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actives</p>
          {active.map(h => (
            <HypothesisCard
              key={h.id}
              hypothesis={h}
              expanded={!!expanded[h.id]}
              onToggle={() => toggle(h.id)}
              onNewVersion={() => {
                setNewVersionFrom(h)
                setNewVersionForm({ title: "", description: "" })
                setNewVersionError("")
              }}
              onPivot={() => { setPivotTarget(h); setPivotReason("") }}
            />
          ))}
        </div>
      )}

      {/* Hypothèses archivées */}
      {archived.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Archivées (versions précédentes)</p>
          {archived.map(h => (
            <HypothesisCard
              key={h.id}
              hypothesis={h}
              expanded={!!expanded[h.id]}
              onToggle={() => toggle(h.id)}
            />
          ))}
        </div>
      )}

      {/* Pivots / abandonnées */}
      {abandoned.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pivots</p>
          {abandoned.map(h => (
            <HypothesisCard
              key={h.id}
              hypothesis={h}
              expanded={!!expanded[h.id]}
              onToggle={() => toggle(h.id)}
            />
          ))}
        </div>
      )}

      {/* Dialog nouvelle version */}
      <Dialog open={!!newVersionFrom} onOpenChange={open => !open && setNewVersionFrom(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle version de l'hypothèse</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            La version actuelle (<strong>v{newVersionFrom?.version}</strong>) sera archivée. Définissez la nouvelle version.
          </p>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input
                placeholder="Titre de la nouvelle hypothèse"
                value={newVersionForm.title}
                onChange={e => setNewVersionForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={4}
                placeholder="Description de la nouvelle hypothèse…"
                value={newVersionForm.description}
                onChange={e => setNewVersionForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            {newVersionError && <p className="text-xs text-destructive">{newVersionError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNewVersionFrom(null)}>Annuler</Button>
              <Button onClick={handleNewVersion} disabled={newVersionLoading}>
                {newVersionLoading ? "Création…" : "Créer la nouvelle version"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pivot */}
      <AlertDialog open={!!pivotTarget} onOpenChange={open => !open && setPivotTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Signaler un pivot
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette hypothèse sera marquée comme <strong>abandonnée</strong> suite à un pivot.
              Une nouvelle hypothèse vide sera créée pour définir la nouvelle direction.
              Cette action documente l'incertitude technologique pour l'ARC.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 my-2">
            <Label>Raison du pivot *</Label>
            <Textarea
              placeholder="Ex: Les résultats des tests ont démontré que l'approche initiale n'était pas viable car…"
              rows={4}
              value={pivotReason}
              onChange={e => setPivotReason(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Important pour la documentation ARC — décrivez ce qui a été découvert et pourquoi la direction a changé.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 hover:bg-amber-600"
              onClick={handlePivot}
              disabled={pivotLoading || !pivotReason.trim()}
            >
              {pivotLoading ? "Enregistrement…" : "Confirmer le pivot"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function HypothesisCard({
  hypothesis,
  expanded,
  onToggle,
  onNewVersion,
  onPivot,
}: {
  hypothesis: Hypothesis
  expanded: boolean
  onToggle: () => void
  onNewVersion?: () => void
  onPivot?: () => void
}) {
  const cfg = STATUS_CONFIG[hypothesis.status]

  return (
    <Card className={hypothesis.status !== "ACTIVE" ? "opacity-70" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">v{hypothesis.version}</span>
              <p className="text-sm font-medium">{hypothesis.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>

            {/* Description */}
            <p className={`text-sm text-muted-foreground mt-1.5 ${expanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
              {hypothesis.description}
            </p>

            {/* Raison du pivot */}
            {hypothesis.status === "ABANDONED" && hypothesis.pivotReason && expanded && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs font-semibold text-amber-700 mb-1">Raison du pivot</p>
                <p className="text-xs text-amber-800 whitespace-pre-wrap">{hypothesis.pivotReason}</p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={onToggle}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? "Réduire" : "Voir plus"}
              </button>
              <span className="text-xs text-muted-foreground">
                {new Date(hypothesis.createdAt).toLocaleDateString("fr-CA")}
              </span>
            </div>
          </div>

          {/* Actions — seulement pour les hypothèses actives */}
          {hypothesis.status === "ACTIVE" && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={onNewVersion}
              >
                <GitBranch className="h-3 w-3" />
                Nouvelle version
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-amber-200 text-amber-600 hover:bg-amber-50"
                onClick={onPivot}
              >
                <Archive className="h-3 w-3" />
                Pivot
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
