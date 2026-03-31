"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  X, ChevronDown, Trash2, Loader2, RefreshCw,
  FlaskConical, ClipboardList, Beaker, Ruler, Target,
  BarChart2, Lightbulb, Clock, User, CheckCircle, XCircle, Circle,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
type CardFull = {
  id: string
  title: string
  hypothesisText: string
  method?: string | null
  materials?: string | null
  variables?: string | null
  expectedResult?: string | null
  actualResult?: string | null
  conclusion?: string | null
  resultType?: string | null
  status: string
  estimatedHours?: number | null
  actualHours?: number | null
  isRDEligible: boolean
  assignee?: { id: string; name: string } | null
  sprint?: { id: string; title: string } | null
  hypothesis?: { id: string; title: string } | null
  pivots: any[]
  journalEntries: any[]
  attachments: any[]
}

interface Props {
  card: CardFull | null
  projectId: string
  members: { id: string; name: string }[]
  onClose: () => void
  onUpdated: (card: CardFull) => void
  onPivot: (card: CardFull) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────
const dark = {
  bg:     "#030c1a",
  card:   "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  text:   "white",
  sub:    "#64748b",
}

const STATUS_CFG: Record<string, { label: string; color: string; bar: string }> = {
  HYPOTHESIS:        { label: "Hypothèse",           color: "#8b5cf6", bar: "#8b5cf6" },
  PROTOCOL_DEFINED:  { label: "Protocole défini",    color: "#3b82f6", bar: "#3b82f6" },
  IN_PROGRESS:       { label: "En cours",            color: "#f97316", bar: "#f97316" },
  RESULT_OBTAINED:   { label: "Résultat obtenu",     color: "#06b6d4", bar: "#06b6d4" },
  ANALYSIS:          { label: "Analyse",             color: "#f59e0b", bar: "#f59e0b" },
  VALIDATED:         { label: "Validée",             color: "#10b981", bar: "#10b981" },
  PIVOTED:           { label: "Pivot",               color: "#ef4444", bar: "#ef4444" },
}

const STATUSES = [
  "HYPOTHESIS", "PROTOCOL_DEFINED", "IN_PROGRESS",
  "RESULT_OBTAINED", "ANALYSIS", "VALIDATED", "PIVOTED",
]

const RESULT_SHOW_THRESHOLD = ["RESULT_OBTAINED", "ANALYSIS", "VALIDATED", "PIVOTED"]

// ─── Editable text section ────────────────────────────────────────────────────
function EditableSection({
  icon, label, value, field, onSave, multiline = true, placeholder,
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
  field: string
  onSave: (field: string, value: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)

  const handleBlur = () => {
    setEditing(false)
    if (draft !== (value ?? "")) {
      onSave(field, draft)
    }
  }

  const startEdit = () => {
    setDraft(value ?? "")
    setEditing(true)
    setTimeout(() => ref.current?.focus(), 50)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 6,
        color: dark.sub,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}>
        {icon}
        {label}
      </div>
      {editing ? (
        multiline ? (
          <Textarea
            ref={ref as any}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            rows={3}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "white",
              fontSize: 13,
              resize: "vertical",
              borderRadius: 6,
            }}
          />
        ) : (
          <Input
            ref={ref as any}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "white",
              fontSize: 13,
            }}
          />
        )
      ) : (
        <div
          onClick={startEdit}
          style={{
            minHeight: 36,
            padding: "8px 10px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 6,
            color: value ? "white" : dark.sub,
            fontSize: 13,
            lineHeight: 1.6,
            cursor: "text",
            whiteSpace: "pre-wrap",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
        >
          {value || <span style={{ fontStyle: "italic" }}>{placeholder || `Cliquer pour modifier...`}</span>}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function ExperimentCardModal({ card, projectId, members, onClose, onUpdated, onPivot }: Props) {
  const [data, setData] = useState<CardFull | null>(card)
  const [saving, setSaving] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!data) return null

  const statusCfg = STATUS_CFG[data.status] ?? STATUS_CFG.HYPOTHESIS
  const showResults = RESULT_SHOW_THRESHOLD.includes(data.status)

  const patch = async (updates: Partial<CardFull>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/projets/${projectId}/experiment-cards/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updated = await res.json()
        const merged = { ...data, ...updated }
        setData(merged)
        onUpdated(merged)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleFieldSave = (field: string, value: string) => {
    patch({ [field]: value } as any)
  }

  const handleDelete = async () => {
    if (!confirm("Supprimer cette expérience?")) return
    setDeleting(true)
    try {
      await fetch(`/api/projets/${projectId}/experiment-cards/${data.id}`, { method: "DELETE" })
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={!!data} onOpenChange={v => !v && onClose()}>
      <DialogContent
        style={{
          background: dark.bg,
          border: "1px solid rgba(255,255,255,0.08)",
          maxWidth: 860,
          width: "95vw",
          maxHeight: "92vh",
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top color bar */}
        <div style={{ height: 4, background: statusCfg.bar, flexShrink: 0 }} />

        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          background: "rgba(255,255,255,0.02)",
        }}>
          {/* Status pill */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 20,
                background: `${statusCfg.color}22`,
                border: `1px solid ${statusCfg.color}55`,
                color: statusCfg.color,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {statusCfg.label}
              <ChevronDown size={11} />
            </button>
            {showStatusMenu && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                zIndex: 50,
                background: "#0d1527",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                overflow: "hidden",
                minWidth: 180,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}>
                {STATUSES.map(s => {
                  const cfg = STATUS_CFG[s]
                  return (
                    <button
                      key={s}
                      onClick={() => { setShowStatusMenu(false); patch({ status: s } as any) }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 12px",
                        fontSize: 12,
                        color: s === data.status ? cfg.color : "white",
                        background: s === data.status ? `${cfg.color}15` : "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: s === data.status ? 700 : 400,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${cfg.color}15`)}
                      onMouseLeave={e => (e.currentTarget.style.background = s === data.status ? `${cfg.color}15` : "transparent")}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Title (inline edit) */}
          <TitleEditor
            value={data.title}
            onSave={v => patch({ title: v })}
          />

          {saving && <Loader2 size={14} color={dark.sub} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />}

          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: dark.sub, marginLeft: "auto", flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body: 2 columns */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* LEFT — main content */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 20px 20px 20px",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}>
            <EditableSection
              icon={<FlaskConical size={12} />}
              label="Hypothèse"
              value={data.hypothesisText}
              field="hypothesisText"
              onSave={handleFieldSave}
              placeholder="Décrivez l'hypothèse scientifique..."
            />
            <EditableSection
              icon={<ClipboardList size={12} />}
              label="Protocole & Méthode"
              value={data.method}
              field="method"
              onSave={handleFieldSave}
              placeholder="Décrivez la méthode expérimentale..."
            />
            <EditableSection
              icon={<Beaker size={12} />}
              label="Matériaux & Équipements"
              value={data.materials}
              field="materials"
              onSave={handleFieldSave}
              placeholder="Listez les matériaux et équipements nécessaires..."
            />
            <EditableSection
              icon={<Ruler size={12} />}
              label="Variables (indépendantes / dépendantes / contrôle)"
              value={data.variables}
              field="variables"
              onSave={handleFieldSave}
              placeholder="Variables indépendantes: ...\nVariables dépendantes: ...\nVariables de contrôle: ..."
            />
            <EditableSection
              icon={<Target size={12} />}
              label="Résultat attendu"
              value={data.expectedResult}
              field="expectedResult"
              onSave={handleFieldSave}
              placeholder="Quel résultat attendez-vous si l'hypothèse est correcte?"
            />

            {/* Results section */}
            {showResults && (
              <>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  margin: "20px 0 16px",
                  color: dark.sub,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                  <span>RÉSULTATS</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                </div>

                <EditableSection
                  icon={<BarChart2 size={12} />}
                  label="Résultat réel"
                  value={data.actualResult}
                  field="actualResult"
                  onSave={handleFieldSave}
                  placeholder="Décrivez les résultats obtenus..."
                />
                <EditableSection
                  icon={<Lightbulb size={12} />}
                  label="Conclusion"
                  value={data.conclusion}
                  field="conclusion"
                  onSave={handleFieldSave}
                  placeholder="Quelle est votre conclusion scientifique?"
                />

                {/* Result type */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: dark.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    Type de résultat
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { key: "CONCLUSIVE", label: "Concluant ✓", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
                      { key: "NON_CONCLUSIVE", label: "Non concluant ✗", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
                      { key: "PARTIAL", label: "Partiel ~", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => patch({ resultType: opt.key } as any)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          background: data.resultType === opt.key ? opt.bg : "rgba(255,255,255,0.04)",
                          border: `1px solid ${data.resultType === opt.key ? opt.color : "rgba(255,255,255,0.08)"}`,
                          color: data.resultType === opt.key ? opt.color : dark.sub,
                          transition: "all 0.15s",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT sidebar */}
          <div style={{
            width: 220,
            flexShrink: 0,
            overflowY: "auto",
            padding: "20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}>
            {/* Assignee */}
            <SidebarField label="Assigné" icon={<User size={12} />}>
              <Select
                value={data.assignee?.id ?? "none"}
                onValueChange={v => patch({ assignee: v === "none" ? null : ({ id: v, name: members.find(m => m.id === v)?.name ?? "" }) } as any)}
              >
                <SelectTrigger style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.08)", color: "white", fontSize: 12, height: 32 }}>
                  <SelectValue placeholder="Non assigné" />
                </SelectTrigger>
                <SelectContent style={{ background: "#0d1527", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <SelectItem value="none" style={{ color: dark.sub }}>Non assigné</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id} style={{ color: "white" }}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SidebarField>

            {/* Estimated hours */}
            <SidebarField label="Heures estimées" icon={<Clock size={12} />}>
              <Input
                type="number"
                value={data.estimatedHours ?? ""}
                onChange={e => patch({ estimatedHours: e.target.value ? Number(e.target.value) : null } as any)}
                placeholder="0h"
                style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.08)", color: "white", fontSize: 12, height: 32 }}
              />
            </SidebarField>

            {/* Actual hours */}
            <SidebarField label="Heures réelles" icon={<Clock size={12} />}>
              <Input
                type="number"
                value={data.actualHours ?? ""}
                onChange={e => patch({ actualHours: e.target.value ? Number(e.target.value) : null } as any)}
                placeholder="0h"
                style={{ background: dark.card, border: "1px solid rgba(255,255,255,0.08)", color: "white", fontSize: 12, height: 32 }}
              />
            </SidebarField>

            {/* RS&DE toggle */}
            <SidebarField label="Éligible RS&DE" icon={<CheckCircle size={12} />}>
              <button
                onClick={() => patch({ isRDEligible: !data.isRDEligible } as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: data.isRDEligible ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${data.isRDEligible ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)"}`,
                  color: data.isRDEligible ? "#34d399" : dark.sub,
                  transition: "all 0.15s",
                }}
              >
                {data.isRDEligible ? <CheckCircle size={11} /> : <Circle size={11} />}
                {data.isRDEligible ? "Éligible" : "Non éligible"}
              </button>
            </SidebarField>

            {/* Sprint info */}
            {data.sprint && (
              <SidebarField label="Sprint" icon={<ClipboardList size={12} />}>
                <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 500 }}>{data.sprint.title}</div>
              </SidebarField>
            )}

            {/* Pivot count */}
            {data.pivots.length > 0 && (
              <div style={{
                padding: "8px 10px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 6,
                fontSize: 12,
                color: "#fca5a5",
              }}>
                <RefreshCw size={11} style={{ display: "inline", marginRight: 4 }} />
                {data.pivots.length} pivot{data.pivots.length > 1 ? "s" : ""} documenté{data.pivots.length > 1 ? "s" : ""}
              </div>
            )}

            <div style={{ flex: 1 }} />

            {/* Pivot button */}
            <Button
              onClick={() => onPivot(data)}
              style={{
                background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))",
                border: "1px solid rgba(239,68,68,0.35)",
                color: "#fca5a5",
                fontWeight: 700,
                fontSize: 13,
                height: 40,
                width: "100%",
              }}
            >
              <RefreshCw size={14} style={{ marginRight: 6 }} />
              ↻ Documenter un pivot
            </Button>

            {/* Delete */}
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              style={{ color: "#ef4444", fontSize: 12, height: 32, opacity: 0.7 }}
            >
              {deleting ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite", marginRight: 4 }} /> : <Trash2 size={12} style={{ marginRight: 4 }} />}
              Supprimer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sidebar field wrapper ─────────────────────────────────────────────────────
function SidebarField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, color: dark.sub, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}

// ─── Title inline editor ───────────────────────────────────────────────────────
function TitleEditor({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const handleBlur = () => {
    setEditing(false)
    if (draft.trim() && draft !== value) onSave(draft.trim())
    else setDraft(value)
  }

  if (editing) {
    return (
      <Input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
        autoFocus
        style={{
          flex: 1,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "white",
          fontSize: 15,
          fontWeight: 700,
          height: 36,
        }}
      />
    )
  }

  return (
    <h2
      onClick={() => { setDraft(value); setEditing(true) }}
      style={{
        flex: 1,
        color: "white",
        fontSize: 15,
        fontWeight: 700,
        margin: 0,
        cursor: "text",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        padding: "4px 6px",
        borderRadius: 4,
        transition: "background 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {value}
    </h2>
  )
}
