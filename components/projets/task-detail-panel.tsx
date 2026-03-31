"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  CheckSquare, Diamond, ChevronsDown, X, Plus, ArrowRight,
  Trash2, Loader2, Save, Pencil, Check, AlignLeft,
  Calendar, User, Flag, Clock, Link2, ChevronDown,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
type Dep = {
  predecessorId: string; successorId: string; type: string; lag: number
  predecessor: { id: string; title: string }
  successor:   { id: string; title: string }
}
export type TaskFull = {
  id: string; title: string; description: string | null
  status: string; priority: string; isMilestone: boolean
  startDate: string | null; dueDate: string | null
  isRDEligible?: boolean; estimatedHours?: number | null
  parentId: string | null
  assignee: { id: string; name: string } | null
  children?: { id: string; title: string; status: string; isMilestone?: boolean }[]
  predecessors: Dep[]
  successors: Dep[]
}
type TaskLight = { id: string; title: string; isMilestone: boolean; parentId: string | null }

const DEP_LABELS: Record<string, string> = {
  FINISH_TO_START: "Fin → Début (FD)", START_TO_START: "Début → Début (DD)",
  FINISH_TO_FINISH: "Fin → Fin (FF)", START_TO_FINISH: "Début → Fin (DF)",
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; bar: string; pill: string }> = {
  TODO:        { label:"À faire",     bg:"bg-slate-100",   text:"text-slate-600",   bar:"#94a3b8", pill:"bg-slate-500" },
  IN_PROGRESS: { label:"En cours",    bg:"bg-blue-500",    text:"text-white",       bar:"#3b82f6", pill:"bg-blue-500"  },
  IN_REVIEW:   { label:"En révision", bg:"bg-amber-100",   text:"text-amber-700",   bar:"#f59e0b", pill:"bg-amber-500" },
  DONE:        { label:"Terminé",     bg:"bg-emerald-100", text:"text-emerald-700", bar:"#10b981", pill:"bg-emerald-500"},
  BLOCKED:     { label:"Bloqué",      bg:"bg-red-100",     text:"text-red-700",     bar:"#ef4444", pill:"bg-red-500"   },
  ABANDONED:   { label:"Abandonné",   bg:"bg-slate-100",   text:"text-slate-400",   bar:"#d1d5db", pill:"bg-slate-400" },
}
const PRI_CFG: Record<string, { label: string; color: string; icon: string }> = {
  LOW:      { label:"Faible",   color:"text-slate-400", icon:"🏳️" },
  MEDIUM:   { label:"Moyen",    color:"text-blue-500",  icon:"🚩" },
  HIGH:     { label:"Haute",    color:"text-amber-500", icon:"🔶" },
  CRITICAL: { label:"Critique", color:"text-red-500",   icon:"🔴" },
}

function StatusPill({ status, onClick }: { status: string; onClick?: () => void }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.TODO
  const isBlue = status === "IN_PROGRESS"
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold transition-all hover:opacity-90 active:scale-95 ${isBlue ? "bg-blue-500 text-white" : `${cfg.bg} ${cfg.text}`}`}
      style={isBlue ? { boxShadow:"0 2px 8px rgba(59,130,246,0.4)" } : {}}
    >
      {cfg.label}
      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
    </button>
  )
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 min-h-[44px]">
      <div className="flex items-center gap-2 w-28 shrink-0 text-slate-500">
        <span className="text-slate-400">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

interface Props {
  task: TaskFull | null
  allTasks: TaskLight[]
  projectId: string
  members: { id: string; name: string }[]
  onClose: () => void
  onUpdated: (task: TaskFull) => void
}

export function TaskDetailPanel({ task, allTasks, projectId, members, onClose, onUpdated }: Props) {
  const [saving,       setSaving]      = useState(false)
  const [depType,      setDepType]     = useState("FINISH_TO_START")
  const [depPred,      setDepPred]     = useState("")
  const [depLag,       setDepLag]      = useState("0")
  const [addingDep,    setAddingDep]   = useState(false)
  const [showAddDep,   setShowAddDep]  = useState(false)
  const [editingTitle, setEditTitle]   = useState(false)
  const [titleVal,     setTitleVal]    = useState("")
  const [editingDesc,  setEditDesc]    = useState(false)
  const [descVal,      setDescVal]     = useState("")
  const [showDeps,     setShowDeps]    = useState(false)
  const [showConvert,  setShowConvert] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (task) {
      setTitleVal(task.title)
      setDescVal(task.description ?? "")
      setEditTitle(false)
      setEditDesc(false)
      setShowAddDep(false)
    }
  }, [task?.id])

  useEffect(() => { if (editingTitle) titleRef.current?.focus() }, [editingTitle])

  if (!task) return null

  const sc  = STATUS_CFG[task.status] ?? STATUS_CFG.TODO
  const pc  = PRI_CFG[task.priority]  ?? PRI_CFG.MEDIUM
  const currentType = task.isMilestone ? "milestone" : task.parentId ? "subtask" : "task"

  async function patch(body: Record<string, unknown>) {
    setSaving(true)
    const res = await fetch(`/api/projets/${projectId}/taches/${task!.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) onUpdated(await res.json())
    setSaving(false)
  }

  async function saveTitle() {
    if (!titleVal.trim() || titleVal === task!.title) { setEditTitle(false); return }
    await patch({ title: titleVal.trim() })
    setEditTitle(false)
  }

  async function saveDesc() {
    if (descVal === (task!.description ?? "")) { setEditDesc(false); return }
    await patch({ description: descVal || null })
    setEditDesc(false)
  }

  async function addDep() {
    if (!depPred) return
    setAddingDep(true)
    await fetch(`/api/projets/${projectId}/dependances`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predecessorId: depPred, successorId: task!.id, type: depType, lag: parseInt(depLag) || 0 }),
    })
    const updated = await fetch(`/api/projets/${projectId}/taches/${task!.id}`).then(r => r.ok ? r.json() : null)
    if (updated) onUpdated(updated)
    setDepPred(""); setShowAddDep(false); setAddingDep(false)
  }

  async function removeDep(predecessorId: string, successorId: string) {
    await fetch(`/api/projets/${projectId}/dependances`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predecessorId, successorId }),
    })
    const updated = await fetch(`/api/projets/${projectId}/taches/${task!.id}`).then(r => r.ok ? r.json() : null)
    if (updated) onUpdated(updated)
  }

  const potentialParents = allTasks.filter(t => t.id !== task.id && !t.isMilestone && !t.parentId)
  const existingPredIds  = new Set(task.predecessors.map(d => d.predecessorId))
  const potentialPreds   = allTasks.filter(t => t.id !== task.id && !existingPredIds.has(t.id))

  return (
    <Dialog open={!!task} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="w-[90vw] sm:max-w-4xl p-0 gap-0 overflow-hidden rounded-2xl flex flex-col"
        style={{ boxShadow:"0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)", maxHeight:"88vh", width:"min(90vw, 960px)" }}
      >
        {/* ── Top color bar ── */}
        <div className="h-1 w-full shrink-0" style={{ background: sc.bar }} />

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-2">
            {/* Type badge */}
            {task.isMilestone
              ? <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md"><Diamond className="h-3 w-3 fill-amber-400"/>Jalon</span>
              : task.parentId
              ? <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md"><ChevronsDown className="h-3 w-3"/>Sous-tâche</span>
              : <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md"><CheckSquare className="h-3 w-3"/>Tâche</span>
            }
            {task.isRDEligible && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">✦ RS&DE</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            <button
              onClick={async () => {
                if (!confirm("Supprimer cette tâche ?")) return
                await fetch(`/api/projets/${projectId}/taches/${task.id}`, { method:"DELETE" })
                onClose()
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Left: main content ── */}
          <div className="flex-1 overflow-y-auto px-5 py-5 min-w-0">

            {/* Editable Title */}
            <div className="mb-5">
              {editingTitle ? (
                <div className="flex items-start gap-2">
                  <input
                    ref={titleRef}
                    value={titleVal}
                    onChange={e => setTitleVal(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditTitle(false) }}
                    className="flex-1 text-2xl font-bold text-slate-800 bg-transparent border-b-2 border-indigo-400 outline-none pb-1 leading-tight"
                  />
                  <button onClick={saveTitle} className="mt-1.5 text-indigo-600 hover:text-indigo-700">
                    <Check className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="group flex items-start gap-2 cursor-text" onClick={() => setEditTitle(true)}>
                  <h2 className={`flex-1 text-2xl font-bold leading-tight ${task.status === "DONE" ? "line-through text-slate-400" : "text-slate-800"}`}>
                    {task.title}
                  </h2>
                  <Pencil className="h-4 w-4 text-slate-300 group-hover:text-slate-500 mt-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              )}
            </div>

            {/* ── Fields ── */}
            <div className="mb-5">
              {/* Status */}
              <Field icon={<div className="h-3 w-3 rounded-full" style={{ background: sc.bar }}/>} label="Statut">
                <Select value={task.status} onValueChange={v => patch({ status: v })}>
                  <SelectTrigger className="h-auto p-0 border-0 shadow-none w-auto bg-transparent focus:ring-0">
                    <StatusPill status={task.status} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CFG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-md ${k === "IN_PROGRESS" ? "bg-blue-500 text-white" : `${v.bg} ${v.text}`}`}>{v.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Dates */}
              <Field icon={<Calendar className="h-3.5 w-3.5"/>} label="Dates">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs w-10 shrink-0">Début</span>
                    <Input type="date" className="h-7 text-xs border-slate-200 flex-1 px-1.5"
                      defaultValue={task.startDate?.slice(0,10) ?? ""}
                      onBlur={e => patch({ startDate: e.target.value || null })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs w-10 shrink-0">{task.isMilestone ? "Jalon" : "Fin"}</span>
                    <Input type="date" className="h-7 text-xs border-slate-200 flex-1 px-1.5"
                      defaultValue={task.dueDate?.slice(0,10) ?? ""}
                      onBlur={e => patch({ dueDate: e.target.value || null })}
                    />
                  </div>
                </div>
              </Field>

              {/* Assignee */}
              <Field icon={<User className="h-3.5 w-3.5"/>} label="Assignés">
                <Select value={task.assignee?.id ?? "none"} onValueChange={v => patch({ assigneeId: v === "none" ? null : v })}>
                  <SelectTrigger className="h-8 text-sm border-slate-200 w-[200px]">
                    <SelectValue placeholder="Non assigné"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non assigné</SelectItem>
                    {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              {/* Priority */}
              <Field icon={<Flag className="h-3.5 w-3.5"/>} label="Priorité">
                <Select value={task.priority} onValueChange={v => patch({ priority: v })}>
                  <SelectTrigger className="h-8 text-sm border-slate-200 w-[140px]">
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRI_CFG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <span className={`text-sm font-semibold ${v.color}`}>{v.icon} {v.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Hours */}
              <Field icon={<Clock className="h-3.5 w-3.5"/>} label="Heures estimées">
                <Input type="number" step="0.5" min="0" className="h-8 text-sm border-slate-200 w-[100px]"
                  defaultValue={task.estimatedHours ?? ""}
                  onBlur={e => patch({ estimatedHours: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="0"
                />
              </Field>

              {/* Plus — Convert type */}
              <Field icon={<Plus className="h-3.5 w-3.5"/>} label="Plus">
                <button onClick={() => setShowConvert(v => !v)} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
                  Convertir / Parent <ChevronDown className={`h-3 w-3 transition-transform ${showConvert ? "rotate-180" : ""}`}/>
                </button>
              </Field>

              {showConvert && (
                <div className="ml-38 pl-[144px] py-2 space-y-2">
                  <div className="flex gap-2">
                    <TypeBtn active={currentType==="task"}      icon={<CheckSquare className="h-3.5 w-3.5"/>} label="Tâche"      onClick={()=>currentType!=="task"&&patch({isMilestone:false,parentId:null})} loading={saving}/>
                    <TypeBtn active={currentType==="milestone"} icon={<Diamond className="h-3.5 w-3.5"/>}    label="Jalon"      onClick={()=>currentType!=="milestone"&&patch({isMilestone:true,parentId:null})} loading={saving}/>
                    <TypeBtn active={currentType==="subtask"}   icon={<ChevronsDown className="h-3.5 w-3.5"/>} label="Sous-tâche" onClick={()=>{}} loading={false} isSubtask/>
                  </div>
                  {(currentType==="subtask"||currentType==="task") && (
                    <Select value={task.parentId ?? "none"} onValueChange={v=>patch(v==="none"?{isMilestone:false,parentId:null}:{isMilestone:false,parentId:v})}>
                      <SelectTrigger className="h-8 text-xs border-slate-200 w-[260px]"><SelectValue placeholder="Tâche parente (optionnel)"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Aucune (tâche principale)</SelectItem>
                        {potentialParents.map(t=><SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            {/* ── Description ── */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2 text-slate-500">
                <AlignLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Description</span>
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <Textarea
                    value={descVal}
                    onChange={e => setDescVal(e.target.value)}
                    autoFocus
                    rows={5}
                    className="text-sm border-slate-200 resize-none w-full"
                    placeholder="Ajoutez une description…"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={saveDesc}
                      style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                      <Save className="h-3 w-3" /> Enregistrer
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditDesc(false); setDescVal(task.description ?? "") }}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditDesc(true)}
                  className="min-h-[80px] p-3 rounded-xl border border-dashed border-slate-200 text-sm cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all group"
                >
                  {task.description
                    ? <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{task.description}</p>
                    : <span className="text-slate-300 italic group-hover:text-slate-400 transition-colors">Ajoutez une description ou écrivez avec IA…</span>
                  }
                </div>
              )}
            </div>

            {/* ── Dependencies ── */}
            <div className="mb-4">
              <button
                onClick={() => setShowDeps(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 mb-2 transition-colors"
              >
                <Link2 className="h-4 w-4 text-slate-400" />
                Dépendances
                {(task.predecessors.length + task.successors.length) > 0 && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                    {task.predecessors.length + task.successors.length}
                  </span>
                )}
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 ml-auto transition-transform ${showDeps ? "rotate-180" : ""}`} />
                <button
                  onClick={e => { e.stopPropagation(); setShowDeps(true); setShowAddDep(true) }}
                  className="ml-1 text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                >
                  <Plus className="h-3 w-3" /> Ajouter
                </button>
              </button>

              {showDeps && (
                <div className="space-y-1.5 ml-6">
                  {task.predecessors.map(d => (
                    <div key={d.predecessorId} className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0"/>
                      <span className="flex-1 truncate font-medium text-slate-700">{d.predecessor.title}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{DEP_LABELS[d.type]?.split(" ")[0]}</span>
                      {d.lag !== 0 && <span className="text-[10px] text-slate-400">{d.lag>0?`+${d.lag}j`:`${d.lag}j`}</span>}
                      <button onClick={() => removeDep(d.predecessorId, d.successorId)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <X className="h-3.5 w-3.5"/>
                      </button>
                    </div>
                  ))}
                  {task.successors.map(d => (
                    <div key={d.successorId} className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <ArrowRight className="h-3 w-3 text-blue-400 shrink-0"/>
                      <span className="flex-1 truncate font-medium text-blue-700">{d.successor.title}</span>
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-100 px-1.5 py-0.5 rounded">{DEP_LABELS[d.type]?.split(" ")[0]}</span>
                    </div>
                  ))}

                  {showAddDep && (
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2 mt-2">
                      <Select value={depPred} onValueChange={setDepPred}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tâche précédente…"/></SelectTrigger>
                        <SelectContent>
                          {potentialPreds.map(t=>(
                            <SelectItem key={t.id} value={t.id}>{t.isMilestone ? "◆ " : ""}{t.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-slate-400 mb-1 font-semibold uppercase">Type</p>
                          <Select value={depType} onValueChange={setDepType}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              {Object.entries(DEP_LABELS).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 mb-1 font-semibold uppercase">Décalage (jours)</p>
                          <Input className="h-7 text-xs" type="number" value={depLag} onChange={e=>setDepLag(e.target.value)}/>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={addDep} disabled={!depPred||addingDep}
                          style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                          {addingDep ? <Loader2 className="h-3 w-3 animate-spin"/> : <Save className="h-3 w-3"/>} Ajouter
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={()=>setShowAddDep(false)}>Annuler</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Subtasks ── */}
            {task.children && task.children.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                  <ChevronsDown className="h-4 w-4 text-slate-400"/>
                  Sous-tâches
                  <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{task.children.length}</span>
                </p>
                <div className="space-y-1 ml-6">
                  {task.children.map(c => {
                    const csc = STATUS_CFG[c.status] ?? STATUS_CFG.TODO
                    return (
                      <div key={c.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: csc.bar }}/>
                        <span className={`text-sm flex-1 ${c.status==="DONE"?"line-through text-slate-400":"text-slate-700"}`}>{c.title}</span>
                        {c.isMilestone && <Diamond className="h-3 w-3 text-amber-400 fill-amber-300 shrink-0"/>}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${c.status==="IN_PROGRESS"?"bg-blue-500 text-white":`${csc.bg} ${csc.text}`}`}>{csc.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: info sidebar ── */}
          <div className="w-56 shrink-0 border-l border-slate-100 bg-slate-50/60 overflow-y-auto px-4 py-5 space-y-5">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Informations</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">ID</span>
                  <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">#{task.id.slice(-6)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Type</span>
                  <span className="text-xs font-semibold text-slate-600">
                    {task.isMilestone ? "◆ Jalon" : task.parentId ? "↳ Sous-tâche" : "☐ Tâche"}
                  </span>
                </div>
                {task.estimatedHours && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Estimation</span>
                    <span className="text-xs font-bold text-slate-700">{task.estimatedHours}h</span>
                  </div>
                )}
              </div>
            </div>

            {/* RS&DE toggle */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">RS&DE</p>
              <button
                onClick={() => patch({ isRDEligible: !task.isRDEligible })}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  task.isRDEligible
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${task.isRDEligible ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
                  {task.isRDEligible && <Check className="h-2.5 w-2.5 text-white"/>}
                </div>
                Éligible RS&DE
              </button>
            </div>

            {/* Danger zone */}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={async () => {
                  if (!confirm("Supprimer cette tâche ?")) return
                  await fetch(`/api/projets/${projectId}/taches/${task.id}`, { method:"DELETE" })
                  onClose()
                }}
                className="flex items-center gap-2 text-xs text-red-400 hover:text-red-600 transition-colors w-full px-2 py-1.5 rounded hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5"/> Supprimer la tâche
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TypeBtn({ active, icon, label, onClick, loading, isSubtask }: {
  active: boolean; icon: React.ReactNode; label: string
  onClick: () => void; loading: boolean; isSubtask?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || (isSubtask && active)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
        active ? "border-indigo-400 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-400"
      }`}
      style={active ? { background:"linear-gradient(135deg,#eef2ff,#f5f3ff)", boxShadow:"0 2px 8px rgba(99,102,241,0.15)" } : {}}
    >
      {loading && active ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : icon}
      {label}
    </button>
  )
}
