"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2, XCircle, Loader2, ArrowLeft, ArrowRight,
  Key, FolderOpen, ListChecks, Download, Eye, EyeOff,
  ChevronRight, FolderKanban, AlertTriangle,
} from "lucide-react"

// ─── Types ClickUp ────────────────────────────────────────────────────────────
type CUTeam  = { id: string; name: string; memberCount: number }
type CUSpace = { id: string; name: string }
type CUList  = { id: string; name: string; taskCount: number; folder: string | null }

type SelectedList = {
  id: string; name: string; taskCount: number; folder: string | null
  code: string; startDate: string
}

type ImportResult = {
  listId: string; listName: string
  projectId?: string; projectCode?: string
  tasksCreated: number; milestonesCreated: number; subtasksCreated: number
  error?: string
}

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Connexion",  icon: Key },
  { id: 2, label: "Sélection",  icon: ListChecks },
  { id: 3, label: "Import",     icon: Download },
]

export function ClickUpWizard() {
  const router = useRouter()

  // Step tracking
  const [step, setStep] = useState(1)

  // Step 1 — API key & workspace
  const [apiKey,       setApiKey]       = useState("")
  const [showKey,      setShowKey]      = useState(false)
  const [connecting,   setConnecting]   = useState(false)
  const [connectError, setConnectError] = useState("")
  const [teams,        setTeams]        = useState<CUTeam[]>([])
  const [selectedTeam, setSelectedTeam] = useState<CUTeam | null>(null)

  // Space selection
  const [spaces,        setSpaces]        = useState<CUSpace[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(false)
  const [selectedSpace, setSelectedSpace] = useState<CUSpace | null>(null)

  // List selection
  const [lists,        setLists]        = useState<CUList[]>([])
  const [loadingLists, setLoadingLists] = useState(false)
  const [selected,     setSelected]     = useState<Record<string, SelectedList>>({})

  // Step 3 — import
  const [importing,      setImporting]      = useState(false)
  const [importResults,  setImportResults]  = useState<ImportResult[] | null>(null)
  const [importError,    setImportError]    = useState("")

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function generateCode(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean)
    const base = words.length === 1
      ? name.slice(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, "")
      : words.map(w => w[0]).join("").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5)
    return base || "PROJ"
  }

  // ── Step 1: Connect ──────────────────────────────────────────────────────────
  async function handleConnect() {
    if (!apiKey.trim()) return
    setConnecting(true); setConnectError("")
    try {
      const res = await fetch(`/api/import/clickup?action=teams&apiKey=${encodeURIComponent(apiKey)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur de connexion")
      setTeams(data)
      // Auto-select if single workspace
      if (data.length === 1) {
        setSelectedTeam(data[0])
        await loadSpaces(data[0].id)
      }
    } catch (e: any) {
      setConnectError(e.message)
    } finally {
      setConnecting(false)
    }
  }

  async function loadSpaces(teamId: string) {
    setLoadingSpaces(true)
    try {
      const res = await fetch(`/api/import/clickup?action=spaces&apiKey=${encodeURIComponent(apiKey)}&teamId=${teamId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSpaces(data)
    } finally {
      setLoadingSpaces(false)
    }
  }

  async function selectSpace(space: CUSpace) {
    setSelectedSpace(space)
    setLists([])
    setSelected({})
    setLoadingLists(true)
    try {
      const res = await fetch(`/api/import/clickup?action=lists&apiKey=${encodeURIComponent(apiKey)}&spaceId=${space.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLists(data)
    } finally {
      setLoadingLists(false)
    }
  }

  function toggleList(list: CUList) {
    setSelected(prev => {
      if (prev[list.id]) {
        const next = { ...prev }; delete next[list.id]; return next
      }
      return {
        ...prev,
        [list.id]: {
          ...list,
          code: generateCode(list.name),
          startDate: new Date().toISOString().split("T")[0],
        },
      }
    })
  }

  function toggleAll() {
    if (Object.keys(selected).length === lists.length) {
      setSelected({})
    } else {
      const next: Record<string, SelectedList> = {}
      lists.forEach(l => {
        next[l.id] = { ...l, code: generateCode(l.name), startDate: new Date().toISOString().split("T")[0] }
      })
      setSelected(next)
    }
  }

  // ── Step 3: Import ───────────────────────────────────────────────────────────
  async function handleImport() {
    setImporting(true); setImportError("")
    try {
      const res = await fetch("/api/import/clickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          selectedLists: Object.values(selected).map(l => ({
            id:        l.id,
            name:      l.name,
            code:      l.code,
            startDate: l.startDate,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur d'import")
      setImportResults(data.results)
    } catch (e: any) {
      setImportError(e.message)
    } finally {
      setImporting(false)
    }
  }

  const selectedCount = Object.keys(selected).length
  const totalTasks    = Object.values(selected).reduce((s, l) => s + l.taskCount, 0)

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/import" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-3xl">🟣</span>
        <div>
          <h1 className="text-xl font-bold">Import ClickUp</h1>
          <p className="text-sm text-muted-foreground">Transférez vos projets, tâches et jalons</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const done    = step > s.id
          const current = step === s.id
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                done    ? "text-emerald-600"
                : current ? "text-primary bg-primary/10"
                : "text-muted-foreground"
              }`}>
                {done
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                  : <s.icon className="h-4 w-4 shrink-0" />
                }
                {s.label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Clé API ClickUp personnelle</Label>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleConnect()}
                    className="pr-10 font-mono text-sm"
                  />
                  <button type="button" onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dans ClickUp → Profil → Mes paramètres → Applis → API → Générer une clé personnelle
                </p>
              </div>

              {connectError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <XCircle className="h-4 w-4 shrink-0" />{connectError}
                </div>
              )}

              <Button onClick={handleConnect} disabled={!apiKey.trim() || connecting} className="w-full gap-2">
                {connecting ? <><Loader2 className="h-4 w-4 animate-spin" />Connexion…</> : <><Key className="h-4 w-4" />Se connecter à ClickUp</>}
              </Button>
            </CardContent>
          </Card>

          {/* Workspace selection */}
          {teams.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Connecté — {teams.length > 1 ? "Sélectionnez un workspace" : `Workspace : ${teams[0].name}`}
                </p>
                {teams.length > 1 && (
                  <div className="space-y-2">
                    {teams.map(t => (
                      <button key={t.id} onClick={() => { setSelectedTeam(t); loadSpaces(t.id) }}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                          selectedTeam?.id === t.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                        }`}>
                        <p className="font-medium text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.memberCount} membres</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Space selection */}
                {loadingSpaces && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />Chargement des espaces…
                  </div>
                )}
                {spaces.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Espace</p>
                    <div className="grid grid-cols-2 gap-2">
                      {spaces.map(s => (
                        <button key={s.id} onClick={() => selectSpace(s)}
                          className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                            selectedSpace?.id === s.id ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted/40"
                          }`}>
                          <FolderOpen className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedSpace && lists.length > 0 && (
            <Button onClick={() => setStep(2)} className="w-full gap-2">
              Continuer — Sélectionner les listes <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              Espace : <span className="text-primary">{selectedSpace?.name}</span>
              {" · "}{lists.length} liste{lists.length > 1 ? "s" : ""}
            </p>
            <button onClick={toggleAll} className="text-xs text-primary hover:underline">
              {Object.keys(selected).length === lists.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>

          {/* Group by folder */}
          {(() => {
            const folders  = [...new Set(lists.map(l => l.folder).filter(Boolean))]
            const noFolder = lists.filter(l => !l.folder)
            return (
              <div className="space-y-3">
                {folders.map(folder => (
                  <div key={folder!}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <FolderFilled className="h-3.5 w-3.5" />{folder}
                    </p>
                    <div className="space-y-1.5">
                      {lists.filter(l => l.folder === folder).map(list => <ListRow key={list.id} list={list} />)}
                    </div>
                  </div>
                ))}
                {noFolder.length > 0 && (
                  <div>
                    {folders.length > 0 && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Sans dossier</p>}
                    <div className="space-y-1.5">
                      {noFolder.map(list => <ListRow key={list.id} list={list} />)}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Selected config */}
          {selectedCount > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold">{selectedCount} liste{selectedCount > 1 ? "s" : ""} sélectionnée{selectedCount > 1 ? "s" : ""} · ~{totalTasks} tâche{totalTasks > 1 ? "s" : ""}</p>
                <div className="space-y-2">
                  {Object.values(selected).map(l => (
                    <div key={l.id} className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-muted-foreground min-w-[120px] truncate">{l.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Code :</span>
                        <Input
                          className="h-6 w-20 text-xs font-mono uppercase"
                          value={l.code}
                          maxLength={6}
                          onChange={e => setSelected(p => ({ ...p, [l.id]: { ...p[l.id], code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") } }))}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Début :</span>
                        <Input
                          type="date"
                          className="h-6 text-xs w-32"
                          value={l.startDate}
                          onChange={e => setSelected(p => ({ ...p, [l.id]: { ...p[l.id], startDate: e.target.value } }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />Retour
            </Button>
            <Button onClick={() => { setStep(3); handleImport() }} disabled={selectedCount === 0} className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Importer {selectedCount > 0 ? `${selectedCount} liste${selectedCount > 1 ? "s" : ""}` : ""}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div className="space-y-4">
          {importing && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-semibold">Import en cours…</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Récupération des tâches depuis ClickUp et création des projets.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {importError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <XCircle className="h-4 w-4 shrink-0" />{importError}
            </div>
          )}

          {importResults && (
            <div className="space-y-3">
              {/* Summary */}
              {(() => {
                const ok     = importResults.filter(r => !r.error)
                const failed = importResults.filter(r => r.error)
                const ttasks = ok.reduce((s, r) => s + r.tasksCreated + r.subtasksCreated, 0)
                const tmiles = ok.reduce((s, r) => s + r.milestonesCreated, 0)
                return (
                  <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-semibold text-emerald-800">Import terminé !</p>
                          <p className="text-sm text-emerald-700">
                            {ok.length} projet{ok.length > 1 ? "s" : ""} créé{ok.length > 1 ? "s" : ""}
                            {" · "}{ttasks} tâche{ttasks !== 1 ? "s" : ""}
                            {tmiles > 0 ? ` · ${tmiles} jalon${tmiles !== 1 ? "s" : ""}` : ""}
                          </p>
                        </div>
                      </div>
                      {failed.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          {failed.length} liste{failed.length > 1 ? "s" : ""} en erreur
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })()}

              {/* Per-list results */}
              <div className="space-y-2">
                {importResults.map(r => (
                  <Card key={r.listId} className={r.error ? "border-red-200" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          {r.error
                            ? <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                            : <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          }
                          <span className="font-medium text-sm">{r.listName}</span>
                          {r.projectCode && <Badge variant="outline" className="text-xs font-mono">{r.projectCode}</Badge>}
                        </div>
                        {!r.error && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{r.tasksCreated} tâche{r.tasksCreated !== 1 ? "s" : ""}</span>
                            {r.subtasksCreated > 0 && <span>{r.subtasksCreated} sous-tâche{r.subtasksCreated !== 1 ? "s" : ""}</span>}
                            {r.milestonesCreated > 0 && <span>{r.milestonesCreated} jalon{r.milestonesCreated !== 1 ? "s" : ""}</span>}
                          </div>
                        )}
                        {r.error && <span className="text-xs text-red-600">{r.error}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={() => router.push("/projets")} className="flex-1 gap-2">
                  <FolderKanban className="h-4 w-4" />Voir les projets importés
                </Button>
                <Button variant="outline" onClick={() => { setStep(1); setImportResults(null); setSelected({}) }}>
                  Nouvel import
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ── Sub-component ────────────────────────────────────────────────────────────
  function ListRow({ list }: { list: CUList }) {
    const isChecked = !!selected[list.id]
    return (
      <button
        onClick={() => toggleList(list)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
          isChecked ? "border-primary bg-primary/5" : "hover:bg-muted/40 border-border"
        }`}
      >
        <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          isChecked ? "bg-primary border-primary" : "border-muted-foreground/30"
        }`}>
          {isChecked && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{list.name}</p>
          {list.folder && <p className="text-xs text-muted-foreground">📁 {list.folder}</p>}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {list.taskCount} tâche{list.taskCount !== 1 ? "s" : ""}
        </span>
      </button>
    )
  }
}

// Inline icon since lucide doesn't have FolderFilled
function FolderFilled({ className }: { className?: string }) {
  return <FolderOpen className={className} />
}
