"use client"

import { useState } from "react"
import {
  TrendingUp, CheckSquare, GanttChartSquare, Microscope, ChevronRight,
  FlaskConical, Lightbulb, Flag, FileText, Users,
} from "lucide-react"

const ICONS: Record<string, React.ElementType> = {
  dashboard:   TrendingUp,
  tasks:       CheckSquare,
  gantt:       GanttChartSquare,
  trl:         Microscope,
  "stage-gate": ChevronRight,
  sprints:     FlaskConical,
  hypotheses:  Lightbulb,
  milestones:  Flag,
  charter:     FileText,
  team:        Users,
}

interface Tab {
  key: string
  label: string
  count: number | null
}

interface Props {
  tabs: Tab[]
  panels: Record<string, React.ReactNode>
}

export function ProjectTabs({ tabs, panels }: Props) {
  const [active, setActive] = useState(tabs[0]?.key ?? "")

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display:     "flex",
        flexWrap:    "wrap",
        gap:         4,
        padding:     "4px",
        background:  "rgba(255,255,255,0.03)",
        border:      "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        marginBottom: 20,
      }}>
        {tabs.map(({ key, label, count }) => {
          const isActive = active === key
          const Icon = ICONS[key]
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              style={{
                display:     "flex",
                alignItems:  "center",
                gap:         6,
                padding:     "7px 12px",
                borderRadius: 8,
                border:      "none",
                fontSize:    12,
                fontWeight:  isActive ? 600 : 400,
                cursor:      "pointer",
                transition:  "all 0.15s",
                background:  isActive
                  ? "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(6,182,212,0.08))"
                  : "transparent",
                color:       isActive ? "#22d3ee" : "#64748b",
                boxShadow:   isActive ? "0 0 0 1px rgba(34,211,238,0.2)" : "none",
                whiteSpace:  "nowrap",
              }}
            >
              {Icon && <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />}
              {label}
              {count !== null && count > 0 && (
                <span style={{
                  fontSize:    10,
                  fontWeight:  700,
                  padding:     "1px 5px",
                  borderRadius: 10,
                  background:  isActive ? "rgba(34,211,238,0.2)" : "rgba(255,255,255,0.07)",
                  color:       isActive ? "#22d3ee" : "#64748b",
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div>{panels[active]}</div>
    </div>
  )
}
