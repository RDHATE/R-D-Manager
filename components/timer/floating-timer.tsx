"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTimer, formatTime } from "./timer-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Square, RotateCcw, ChevronUp, ChevronDown, Clock, Check, X } from "lucide-react"

const CAT_LABELS: Record<string, string> = {
  RD_DIRECT:    "R&D directe",
  RD_SUPPORT:   "Support R&D",
  NON_ELIGIBLE: "Non admissible",
}

export function FloatingTimer() {
  const router = useRouter()
  const {
    running, elapsed, projectId, taskId, description, category,
    projects, projectsLoaded,
    start, stop, reset,
    setProjectId, setTaskId, setDescription, setCategory,
    loadProjects, saveEntry,
  } = useTimer()

  const [expanded, setExpanded]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saved, setSaved]         = useState(false)

  // Load projects when expanded for the first time
  useEffect(() => {
    if (expanded && !projectsLoaded) loadProjects()
  }, [expanded, projectsLoaded, loadProjects])

  const selectedProject = projects.find(p => p.id === projectId)

  async function handleStop() {
    stop()
    setExpanded(true)
  }

  async function handleSave() {
    setSaving(true); setSaveError("")
    const result = await saveEntry()
    if (!result.ok) { setSaveError(result.error ?? "Erreur"); setSaving(false); return }
    setSaved(true)
    setTimeout(() => {
      reset()
      setSaved(false)
      setExpanded(false)
      router.refresh()
    }, 1200)
    setSaving(false)
  }

  function handleStart() {
    setSaveError("")
    start()
  }

  // Couleur du timer selon l'état
  const timerColor = running
    ? "text-emerald-400"
    : elapsed > 0
    ? "text-amber-400"
    : "text-slate-400"

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none">
      <div className={`
        bg-slate-900 border rounded-2xl shadow-2xl overflow-hidden
        transition-all duration-300 ease-in-out
        ${expanded ? "w-72" : "w-auto"}
        ${running ? "border-emerald-500/60 shadow-emerald-900/40" : "border-slate-700"}
      `}>

        {/* Expanded panel */}
        {expanded && (
          <div className="p-4 space-y-3 border-b border-slate-700">
            {/* Projet */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Projet</Label>
              <Select
                value={projectId}
                onValueChange={v => { setProjectId(v); setTaskId("none") }}
                disabled={running}
              >
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue placeholder={projectsLoaded ? "Sélectionner…" : "Chargement…"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.code} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tâche */}
            {selectedProject && selectedProject.tasks.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Tâche (optionnel)</Label>
                <Select value={taskId} onValueChange={setTaskId} disabled={running}>
                  <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">Aucune tâche</SelectItem>
                    {selectedProject.tasks.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Catégorie */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Catégorie RS&DE</Label>
              <Select value={category} onValueChange={setCategory} disabled={running}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RD_DIRECT" className="text-xs">R&D directe (100%)</SelectItem>
                  <SelectItem value="RD_SUPPORT" className="text-xs">Support R&D</SelectItem>
                  <SelectItem value="NON_ELIGIBLE" className="text-xs">Non admissible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Description</Label>
              <Input
                className="h-8 text-xs bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500"
                placeholder="Travaux effectués…"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Erreur / Succès */}
            {saveError && (
              <p className="text-xs text-red-400 bg-red-950/40 rounded p-2">{saveError}</p>
            )}
            {saved && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                Entrée enregistrée !
              </div>
            )}

            {/* Boutons save/discard si timer arrêté avec du temps */}
            {!running && elapsed > 0 && !saved && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={handleSave}
                  disabled={saving || !projectId}
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-950/30"
                  onClick={() => { reset(); setExpanded(false) }}
                  title="Annuler"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Bottom bar — toujours visible */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* Timer display */}
          <button
            onClick={() => {
              if (!expanded) loadProjects()
              setExpanded(p => !p)
            }}
            className={`font-mono text-sm font-bold tabular-nums ${timerColor} hover:opacity-80 transition-opacity min-w-[60px]`}
          >
            {formatTime(elapsed)}
          </button>

          {/* Project badge */}
          {selectedProject && (
            <span className="text-xs text-slate-400 truncate max-w-[80px]">
              {selectedProject.code}
            </span>
          )}

          <div className="flex items-center gap-1 ml-auto">
            {/* Expand toggle */}
            <button
              onClick={() => {
                if (!expanded) loadProjects()
                setExpanded(p => !p)
              }}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded"
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>

            {/* Play / Stop */}
            {!running ? (
              <button
                onClick={elapsed > 0 ? () => { setSaveError(""); start() } : handleStart}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full h-8 w-8 flex items-center justify-center transition-colors shadow-lg"
                title={elapsed > 0 ? "Reprendre" : "Démarrer le timer"}
              >
                <Play className="h-3.5 w-3.5 ml-0.5" />
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="bg-red-600 hover:bg-red-500 text-white rounded-full h-8 w-8 flex items-center justify-center transition-colors shadow-lg animate-pulse"
                title="Arrêter le timer"
              >
                <Square className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Indicateur "en cours" */}
        {running && (
          <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400 animate-pulse" />
        )}
      </div>
    </div>
  )
}
