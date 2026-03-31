"use client"

import React, { useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronDown, ZoomIn, ZoomOut, Diamond } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
type GTask = {
  id: string; title: string; status: string; priority: string
  isMilestone: boolean; parentId: string | null
  startDate: string | null; dueDate: string | null
  assignee: { id: string; name: string } | null
  children: { id: string }[]
  predecessors: { predecessorId: string; successorId: string; type: string; lag: number }[]
  successors:   { predecessorId: string; successorId: string; type: string; lag: number }[]
}

const ROW_H  = 38  // px per row
const LEFT_W = 260 // px for task names panel

const STATUS_COLOR: Record<string, string> = {
  TODO:        "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW:   "#8b5cf6",
  DONE:        "#10b981",
  BLOCKED:     "#ef4444",
  ABANDONED:   "#d1d5db",
}
const PRIORITY_BORDER: Record<string, string> = {
  LOW:      "#94a3b8",
  MEDIUM:   "#3b82f6",
  HIGH:     "#f59e0b",
  CRITICAL: "#ef4444",
}

// Zoom levels: pixels per day
const ZOOM_LEVELS = [8, 16, 24, 40]
const ZOOM_LABELS = ["Année", "Semestre", "Mois", "Semaine"]

interface Props {
  tasks: GTask[]
  projectId: string
  onTaskClick?: (task: GTask) => void
}

export function GanttView({ tasks, projectId, onTaskClick }: Props) {
  const [zoomIdx,   setZoomIdx]   = useState(2)  // default: month view
  const [expanded,  setExpanded]  = useState<Record<string, boolean>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  const DAY_W = ZOOM_LEVELS[zoomIdx]

  // ── Flatten tasks in display order ─────────────────────────────────────────
  const flatRows = useMemo(() => {
    const topLevel = tasks.filter(t => !t.parentId)
    const result: (GTask & { level: number })[] = []
    function push(t: GTask, level: number) {
      result.push({ ...t, level })
      if (!t.isMilestone && expanded[t.id] !== false && t.children.length > 0) {
        const children = tasks.filter(c => c.parentId === t.id)
        children.forEach(c => push(c, level + 1))
      }
    }
    topLevel.forEach(t => push(t, 0))
    return result
  }, [tasks, expanded])

  // ── Date range ──────────────────────────────────────────────────────────────
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    const dates: Date[] = []
    tasks.forEach(t => {
      if (t.startDate) dates.push(new Date(t.startDate))
      if (t.dueDate)   dates.push(new Date(t.dueDate))
    })
    const today = new Date()
    dates.push(today)

    const minDate = dates.reduce((a, b) => a < b ? a : b)
    const maxDate = dates.reduce((a, b) => a > b ? a : b)

    // Pad by a bit
    const start = new Date(minDate); start.setDate(start.getDate() - 7)
    const end   = new Date(maxDate); end.setDate(end.getDate() + 14)
    // Snap to month start/end
    start.setDate(1)
    end.setMonth(end.getMonth() + 1); end.setDate(0)

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return { rangeStart: start, rangeEnd: end, totalDays }
  }, [tasks])

  // ── Header months ───────────────────────────────────────────────────────────
  const months = useMemo(() => {
    const result: { label: string; x: number; width: number }[] = []
    const cur = new Date(rangeStart)
    cur.setDate(1)
    while (cur <= rangeEnd) {
      const monthStart = new Date(cur)
      const daysFromRange = Math.max(0, Math.floor((monthStart.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)))
      const daysInMonth   = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate()
      const visibleDays   = Math.min(daysInMonth, totalDays - daysFromRange)
      result.push({
        label: cur.toLocaleDateString("fr-CA", { month: "short", year: "2-digit" }),
        x:     daysFromRange * DAY_W,
        width: visibleDays * DAY_W,
      })
      cur.setMonth(cur.getMonth() + 1)
    }
    return result
  }, [rangeStart, rangeEnd, totalDays, DAY_W])

  // ── Weeks ───────────────────────────────────────────────────────────────────
  const weekLines = useMemo(() => {
    if (DAY_W < 16) return []
    const result: number[] = []
    const cur = new Date(rangeStart)
    while (cur <= rangeEnd) {
      if (cur.getDay() === 1) {
        result.push(Math.floor((cur.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) * DAY_W)
      }
      cur.setDate(cur.getDate() + 1)
    }
    return result
  }, [rangeStart, rangeEnd, DAY_W])

  // ── Today ───────────────────────────────────────────────────────────────────
  const todayX = useMemo(() => {
    const today = new Date()
    const days  = Math.floor((today.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
    return days * DAY_W
  }, [rangeStart, DAY_W])

  // ── Position helpers ────────────────────────────────────────────────────────
  function dayOff(date: Date): number {
    return Math.floor((date.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
  }
  function taskBar(t: GTask): { x: number; width: number } | null {
    if (t.isMilestone) return null
    const start = t.startDate ? new Date(t.startDate) : (t.dueDate ? new Date(t.dueDate) : null)
    const end   = t.dueDate   ? new Date(t.dueDate)   : (t.startDate ? new Date(t.startDate) : null)
    if (!start || !end) return null
    const x = dayOff(start) * DAY_W
    const w = Math.max((dayOff(end) - dayOff(start) + 1) * DAY_W, DAY_W)
    return { x, width: w }
  }
  function milestoneX(t: GTask): number | null {
    if (!t.isMilestone) return null
    const d = t.dueDate ? new Date(t.dueDate) : (t.startDate ? new Date(t.startDate) : null)
    if (!d) return null
    return (dayOff(d) + 0.5) * DAY_W
  }

  // ── Dependency arrows (SVG) ─────────────────────────────────────────────────
  const arrows = useMemo(() => {
    const indexMap: Record<string, number> = {}
    flatRows.forEach((t, i) => { indexMap[t.id] = i })

    const paths: { d: string; key: string }[] = []
    flatRows.forEach(t => {
      t.predecessors.forEach(dep => {
        const predIdx = indexMap[dep.predecessorId]
        const succIdx = indexMap[dep.successorId]
        if (predIdx === undefined || succIdx === undefined) return

        const pred = flatRows[predIdx]
        const succ = flatRows[succIdx]

        // Source point (end of predecessor bar or milestone)
        let x1: number, y1: number, x2: number, y2: number

        if (pred.isMilestone) {
          const mx = milestoneX(pred)
          if (mx === null) return
          x1 = mx + 8
        } else {
          const bar = taskBar(pred)
          if (!bar) return
          x1 = bar.x + bar.width
        }
        y1 = predIdx * ROW_H + ROW_H / 2

        // Target point (start of successor bar or milestone)
        if (succ.isMilestone) {
          const mx = milestoneX(succ)
          if (mx === null) return
          x2 = mx - 8
        } else {
          const bar = taskBar(succ)
          if (!bar) return
          x2 = bar.x
        }
        y2 = succIdx * ROW_H + ROW_H / 2

        const cx = (x1 + x2) / 2
        paths.push({
          key: `${dep.predecessorId}-${dep.successorId}`,
          d:   `M ${x1} ${y1} C ${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`,
        })
      })
    })
    return paths
  }, [flatRows])

  const timelineW = totalDays * DAY_W

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{ZOOM_LABELS[zoomIdx]}</span>
        <Button variant="outline" size="icon" className="h-7 w-7"
          onClick={() => setZoomIdx(i => Math.max(0, i - 1))} disabled={zoomIdx === 0}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7"
          onClick={() => setZoomIdx(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))} disabled={zoomIdx === ZOOM_LEVELS.length - 1}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <div className="flex items-center gap-3 ml-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-blue-500" />En cours</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-emerald-500" />Terminé</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-red-500" />Bloqué</span>
          <span className="flex items-center gap-1.5 text-amber-600"><Diamond className="h-3 w-3 fill-amber-400" />Jalon</span>
        </div>
      </div>

      {/* Gantt container */}
      <div className="border rounded-xl overflow-hidden shadow-sm flex" style={{ minHeight: 200 }}>

        {/* ── Left panel (task names) ── */}
        <div style={{ width: LEFT_W, minWidth: LEFT_W }} className="border-r bg-muted/20 flex-shrink-0">
          {/* Header */}
          <div className="h-10 border-b flex items-center px-3 bg-muted/40">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tâche</span>
          </div>
          {/* Rows */}
          {flatRows.map((t, i) => {
            const hasChildren = t.children.length > 0
            const isExpanded  = expanded[t.id] !== false
            return (
              <div key={t.id}
                style={{ height: ROW_H }}
                className={`flex items-center gap-1.5 px-2 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${i % 2 === 1 ? "bg-muted/10" : ""}`}
                onClick={() => onTaskClick?.(t)}
              >
                {/* Indent */}
                {t.level > 0 && <span style={{ width: t.level * 14 }} className="shrink-0" />}

                {/* Expand toggle */}
                {hasChildren && !t.isMilestone ? (
                  <button onClick={e => { e.stopPropagation(); setExpanded(p => ({ ...p, [t.id]: !isExpanded })) }}
                    className="text-muted-foreground hover:text-foreground shrink-0">
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                ) : (
                  <span className="w-3 shrink-0" />
                )}

                {/* Icon */}
                {t.isMilestone
                  ? <Diamond className="h-3 w-3 fill-amber-400 text-amber-500 shrink-0" />
                  : t.parentId
                    ? <span className="h-2 w-2 rounded-sm border-2 shrink-0" style={{ borderColor: STATUS_COLOR[t.status] }} />
                    : <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: STATUS_COLOR[t.status] }} />
                }

                {/* Title */}
                <span className={`text-xs truncate flex-1 ${t.isMilestone ? "text-amber-700 font-medium" : ""}`}>
                  {t.title}
                </span>

                {/* Priority dot */}
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: PRIORITY_BORDER[t.priority] }} />
              </div>
            )
          })}
        </div>

        {/* ── Right panel (timeline) ── */}
        <div ref={scrollRef} className="overflow-x-auto flex-1">
          <div style={{ width: timelineW, position: "relative" }}>

            {/* Month header */}
            <div className="h-10 border-b flex items-stretch bg-muted/40 sticky top-0" style={{ width: timelineW }}>
              {months.map((m, i) => (
                <div key={i} className="border-r border-border/50 flex items-center justify-center"
                  style={{ width: m.width, minWidth: m.width }}>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">{m.label}</span>
                </div>
              ))}
            </div>

            {/* Grid + bars + SVG overlay */}
            <div style={{ position: "relative", width: timelineW, height: flatRows.length * ROW_H }}>

              {/* Week lines */}
              {weekLines.map((x, i) => (
                <div key={i} style={{ position: "absolute", left: x, top: 0, bottom: 0, width: 1, background: "rgba(148,163,184,0.15)" }} />
              ))}

              {/* Today line */}
              {todayX > 0 && todayX < timelineW && (
                <div style={{ position: "absolute", left: todayX, top: 0, bottom: 0, width: 2, background: "#f59e0b", opacity: 0.8, zIndex: 10 }}>
                  <div style={{ position: "absolute", top: 0, left: -16, background: "#f59e0b", color: "white", fontSize: 9, padding: "1px 4px", borderRadius: 3 }}>
                    Auj.
                  </div>
                </div>
              )}

              {/* Row backgrounds */}
              {flatRows.map((_, i) => (
                <div key={i} style={{ position: "absolute", top: i * ROW_H, left: 0, right: 0, height: ROW_H, background: i % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }} />
              ))}

              {/* Bars & milestones */}
              {flatRows.map((t, i) => {
                const bar = taskBar(t)
                const mx  = milestoneX(t)
                const y   = i * ROW_H + ROW_H / 2
                const barH = t.parentId ? 10 : 16
                const barY = y - barH / 2

                return (
                  <React.Fragment key={t.id}>
                    {bar && (
                      <div
                        style={{
                          position: "absolute",
                          left:     bar.x + 1,
                          top:      barY,
                          width:    bar.width - 2,
                          height:   barH,
                          borderRadius: 4,
                          background: STATUS_COLOR[t.status],
                          opacity:  t.status === "DONE" ? 0.6 : 0.85,
                          border:   `2px solid ${PRIORITY_BORDER[t.priority]}22`,
                          cursor:   "pointer",
                          zIndex:   5,
                        }}
                        onClick={() => onTaskClick?.(t)}
                        title={t.title}
                      >
                        {/* % complete overlay for DONE */}
                        {t.status === "DONE" && (
                          <div style={{ position: "absolute", inset: 0, borderRadius: 3, background: "rgba(255,255,255,0.3)" }} />
                        )}
                        {/* Label inside bar if wide enough */}
                        {bar.width > 60 && (
                          <span style={{ position: "absolute", left: 4, top: 0, bottom: 0, display: "flex", alignItems: "center", fontSize: 10, color: "white", fontWeight: 500, overflow: "hidden", whiteSpace: "nowrap", maxWidth: bar.width - 8 }}>
                            {t.title}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Milestone diamond */}
                    {mx !== null && (
                      <div
                        style={{
                          position: "absolute",
                          left:     mx - 8,
                          top:      y - 8,
                          width:    16,
                          height:   16,
                          transform: "rotate(45deg)",
                          background: t.status === "DONE" ? "#10b981" : "#f59e0b",
                          cursor:   "pointer",
                          zIndex:   6,
                          borderRadius: 2,
                        }}
                        onClick={() => onTaskClick?.(t)}
                        title={t.title}
                      />
                    )}
                  </React.Fragment>
                )
              })}

              {/* SVG dependency arrows */}
              <svg
                style={{ position: "absolute", top: 0, left: 0, width: timelineW, height: flatRows.length * ROW_H, pointerEvents: "none", zIndex: 8 }}
              >
                <defs>
                  <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M 0 0 L 6 3 L 0 6 z" fill="#94a3b8" />
                  </marker>
                </defs>
                {arrows.map(a => (
                  <path key={a.key} d={a.d} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" markerEnd="url(#arrow)" opacity={0.7} />
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {flatRows.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Aucune tâche à afficher. Ajoutez des dates de début et d'échéance pour voir le Gantt.
        </div>
      )}
    </div>
  )
}
