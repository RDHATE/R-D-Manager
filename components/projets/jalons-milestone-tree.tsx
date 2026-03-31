"use client"

import { useState } from "react"
import { Diamond, ChevronRight, ChevronDown, Flag } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const STATUS_COLORS: Record<string, string> = {
  TODO: "#94a3b8", IN_PROGRESS: "#3b82f6", IN_REVIEW: "#f59e0b",
  DONE: "#10b981", BLOCKED: "#ef4444", ABANDONED: "#d1d5db",
}
const STATUS_LABELS: Record<string, string> = {
  TODO: "À faire", IN_PROGRESS: "En cours", IN_REVIEW: "En révision",
  DONE: "Terminé", BLOCKED: "Bloqué", ABANDONED: "Abandonné",
}

type Child = { id: string; title: string; status: string; isMilestone?: boolean }
type MilestoneTask = {
  id: string; title: string; status: string; dueDate: Date | string | null
  children: Child[]
}

export function JalonsMilestonesTree({ milestones }: { milestones: MilestoneTask[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (milestones.length === 0) return null

  return (
    <div className="space-y-2 mb-6">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Diamond className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
        Jalons avec sous-tâches
      </p>
      {milestones.map(m => {
        const isOpen    = expanded[m.id] !== false
        const color     = STATUS_COLORS[m.status] ?? "#94a3b8"
        const doneCount = m.children.filter(c => c.status === "DONE").length
        const pct       = m.children.length > 0 ? Math.round((doneCount / m.children.length) * 100) : null

        return (
          <Card key={m.id} className="overflow-hidden border-slate-200">
            <CardContent className="p-0">
              {/* ── Milestone header ── */}
              <div
                onClick={() => setExpanded(e => ({ ...e, [m.id]: !isOpen }))}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 shrink-0">
                  <Diamond className="h-3.5 w-3.5 text-amber-600 fill-amber-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{m.title}</p>
                  {pct !== null && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{doneCount}/{m.children.length}</span>
                    </div>
                  )}
                </div>

                {m.dueDate && (
                  <div className="flex items-center gap-1 shrink-0 text-xs text-slate-400">
                    <Flag className="h-3 w-3" />
                    {new Date(m.dueDate).toLocaleDateString("fr-CA")}
                  </div>
                )}

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: `${color}20`, color }}>
                  {STATUS_LABELS[m.status] ?? m.status}
                </span>

                {m.children.length > 0 && (
                  isOpen
                    ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                )}
              </div>

              {/* ── Children tree ── */}
              {isOpen && m.children.length > 0 && (
                <div className="border-t border-slate-100 bg-slate-50/50">
                  {m.children.map((c, ci) => {
                    const cColor  = STATUS_COLORS[c.status] ?? "#94a3b8"
                    const isLast  = ci === m.children.length - 1
                    return (
                      <div key={c.id}
                        className="flex items-center gap-3 pl-12 pr-4 py-2.5 hover:bg-slate-100/60 transition-colors relative"
                      >
                        {/* vertical line */}
                        <div style={{ position:"absolute", left: 36, top: 0, bottom: isLast ? "50%" : 0, width: 1, background:"#e2e8f0" }} />
                        {/* horizontal elbow */}
                        <div style={{ position:"absolute", left: 36, top: "50%", width: 14, height: 1, background:"#e2e8f0" }} />

                        <div className="h-2 w-2 rounded-sm shrink-0" style={{ background: cColor }} />
                        <span className={`text-sm flex-1 ${c.status === "DONE" ? "line-through text-slate-400" : "text-slate-700"}`}>
                          {c.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: `${cColor}20`, color: cColor }}>
                          {STATUS_LABELS[c.status] ?? c.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {isOpen && m.children.length === 0 && (
                <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 italic bg-slate-50/50">
                  Aucune sous-tâche liée à ce jalon.
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
