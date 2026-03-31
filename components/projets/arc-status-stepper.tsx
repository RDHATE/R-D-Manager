"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

type ARCStatus =
  | "DRAFT"
  | "HYPOTHESIS_DEFINED"
  | "IN_EXPERIMENTATION"
  | "ANALYZING_RESULTS"
  | "PIVOT"
  | "ADVANCEMENT_REACHED"
  | "CLOSED"

const STEPS: { id: ARCStatus; label: string; shortLabel: string; description: string }[] = [
  {
    id: "DRAFT",
    label: "Brouillon",
    shortLabel: "Brouillon",
    description: "Le projet est en cours de définition",
  },
  {
    id: "HYPOTHESIS_DEFINED",
    label: "Hypothèses définies",
    shortLabel: "Hypothèses",
    description: "Les incertitudes technologiques et hypothèses sont documentées",
  },
  {
    id: "IN_EXPERIMENTATION",
    label: "En expérimentation",
    shortLabel: "Expérimentation",
    description: "Des expériences et tests sont en cours",
  },
  {
    id: "ANALYZING_RESULTS",
    label: "Analyse des résultats",
    shortLabel: "Analyse",
    description: "Les résultats sont en cours d'analyse",
  },
  {
    id: "ADVANCEMENT_REACHED",
    label: "Avancement technologique atteint",
    shortLabel: "Avancement atteint",
    description: "L'incertitude technologique a été résolue — projet admissible RS&DE",
  },
  {
    id: "CLOSED",
    label: "Fermé",
    shortLabel: "Fermé",
    description: "Projet terminé et archivé",
  },
]

// PIVOT est un statut spécial (pas dans le pipeline linéaire)
const PIVOT_STEP = {
  id: "PIVOT" as ARCStatus,
  label: "Pivot",
  shortLabel: "Pivot",
  description: "La direction du projet a changé suite à des résultats inattendus",
}

const ALL_STATUSES = [...STEPS, PIVOT_STEP]

const STEP_COLORS: Record<ARCStatus, string> = {
  DRAFT:               "bg-slate-100 text-slate-600 border-slate-200",
  HYPOTHESIS_DEFINED:  "bg-blue-100 text-blue-700 border-blue-200",
  IN_EXPERIMENTATION:  "bg-violet-100 text-violet-700 border-violet-200",
  ANALYZING_RESULTS:   "bg-amber-100 text-amber-700 border-amber-200",
  PIVOT:               "bg-orange-100 text-orange-700 border-orange-200",
  ADVANCEMENT_REACHED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CLOSED:              "bg-slate-100 text-slate-500 border-slate-200",
}

interface Props {
  projectId: string
  currentStatus: ARCStatus
}

export function ARCStatusStepper({ projectId, currentStatus }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<ARCStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  const currentStepIndex = STEPS.findIndex(s => s.id === status)
  const isPivot = status === "PIVOT"

  async function changeStatus(newStatus: ARCStatus) {
    if (newStatus === status) return
    setLoading(true)
    const res = await fetch(`/api/projets/${projectId}/arc-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arcStatus: newStatus }),
    })
    if (res.ok) {
      setStatus(newStatus)
      router.refresh()
    }
    setLoading(false)
  }

  const currentCfg = ALL_STATUSES.find(s => s.id === status)

  return (
    <div className="space-y-3">
      {/* Badge statut actuel + bouton changer */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Statut ARC :</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={loading}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${STEP_COLORS[status]}`}
            >
              {currentCfg?.label}
              <ChevronRight className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {ALL_STATUSES.map(s => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => changeStatus(s.id)}
                className="flex flex-col items-start gap-0.5 py-2"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${STEP_COLORS[s.id].split(" ")[0]}`} />
                  <span className="font-medium text-sm">{s.label}</span>
                  {s.id === status && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                </div>
                <span className="text-xs text-muted-foreground pl-4">{s.description}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stepper visuel (pipeline linéaire seulement) */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const isCompleted = !isPivot && idx < currentStepIndex
          const isCurrent   = !isPivot && step.id === status
          const isFuture    = isPivot || idx > currentStepIndex

          return (
            <div key={step.id} className="flex items-center">
              {/* Cercle étape */}
              <button
                onClick={() => changeStatus(step.id)}
                disabled={loading}
                title={step.label}
                className={`
                  relative h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold
                  transition-all cursor-pointer hover:scale-110
                  ${isCompleted ? "bg-primary border-primary text-white" : ""}
                  ${isCurrent  ? "bg-primary/10 border-primary text-primary scale-110 shadow-md" : ""}
                  ${isFuture   ? "bg-background border-muted-foreground/30 text-muted-foreground/50" : ""}
                `}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                {isCurrent && (
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-primary font-semibold whitespace-nowrap">
                    {step.shortLabel}
                  </span>
                )}
              </button>

              {/* Connecteur */}
              {idx < STEPS.length - 1 && (
                <div className={`h-0.5 w-6 sm:w-10 ${isCompleted ? "bg-primary" : "bg-muted-foreground/20"}`} />
              )}
            </div>
          )
        })}

        {/* Indicateur pivot séparé */}
        {isPivot && (
          <div className="ml-4 flex items-center gap-1.5">
            <div className="h-px w-4 bg-orange-300" />
            <div className="h-7 w-7 rounded-full border-2 border-orange-400 bg-orange-50 flex items-center justify-center text-[10px] font-bold text-orange-600">
              P
            </div>
            <span className="text-xs text-orange-600 font-medium">Pivot</span>
          </div>
        )}
      </div>

      <div className="h-5" />{/* espace pour les labels en dessous du stepper */}
    </div>
  )
}
