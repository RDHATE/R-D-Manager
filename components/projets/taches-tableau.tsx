"use client"

import React, { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, ChevronRight, ChevronDown,
  List, Type, Calendar, AlignLeft, Hash, Tag,
  CheckSquare, DollarSign, Globe, Mail, Phone,
  Users, TrendingUp, X, Check, Pencil, Trash2,
  Diamond, Flag, FolderKanban, GripVertical,
} from "lucide-react"
import { TaskDetailPanel } from "@/components/projets/task-detail-panel"

/* ─── Types ─────────────────────────────────────── */
type ColumnType = "text"|"longtext"|"number"|"date"|"checkbox"|"money"|"url"|"email"|"phone"|"select"|"labels"|"people"|"progress"
type CustomColumn = { id: string; name: string; type: ColumnType; options?: string[] }
type StatusConfig  = { id: string; label: string; color: string }
type Member        = { id: string; name: string }
type Task = {
  id: string; title: string; status: string; priority: string
  assigneeId?: string | null
  assignee?: { name: string } | null
  startDate?: Date | null; dueDate?: Date | null
  estimatedHours?: number | null; isRDEligible: boolean
  isMilestone?: boolean
  customData?: Record<string, any> | null
  children: Omit<Task,"children">[]
}

/* ─── Catalogues ─────────────────────────────────── */
const FIELD_TYPES: { type: ColumnType; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { type:"select",   label:"Liste déroulante",  icon:<List className="h-4 w-4"/>,        color:"text-emerald-600", bg:"bg-emerald-50" },
  { type:"text",     label:"Texte",             icon:<Type className="h-4 w-4"/>,        color:"text-sky-600",     bg:"bg-sky-50"     },
  { type:"date",     label:"Date",              icon:<Calendar className="h-4 w-4"/>,    color:"text-violet-600",  bg:"bg-violet-50"  },
  { type:"longtext", label:"Zone de texte",     icon:<AlignLeft className="h-4 w-4"/>,   color:"text-indigo-600",  bg:"bg-indigo-50"  },
  { type:"number",   label:"Nombre",            icon:<Hash className="h-4 w-4"/>,        color:"text-blue-600",    bg:"bg-blue-50"    },
  { type:"labels",   label:"Libellés",          icon:<Tag className="h-4 w-4"/>,         color:"text-pink-600",    bg:"bg-pink-50"    },
  { type:"checkbox", label:"Case à cocher",     icon:<CheckSquare className="h-4 w-4"/>, color:"text-teal-600",    bg:"bg-teal-50"    },
  { type:"money",    label:"Argent",            icon:<DollarSign className="h-4 w-4"/>,  color:"text-green-600",   bg:"bg-green-50"   },
  { type:"url",      label:"Site Web",          icon:<Globe className="h-4 w-4"/>,       color:"text-cyan-600",    bg:"bg-cyan-50"    },
  { type:"email",    label:"E-mail",            icon:<Mail className="h-4 w-4"/>,        color:"text-orange-600",  bg:"bg-orange-50"  },
  { type:"phone",    label:"Téléphone",         icon:<Phone className="h-4 w-4"/>,       color:"text-rose-600",    bg:"bg-rose-50"    },
  { type:"people",   label:"Personnes",         icon:<Users className="h-4 w-4"/>,       color:"text-purple-600",  bg:"bg-purple-50"  },
  { type:"progress", label:"Progression",       icon:<TrendingUp className="h-4 w-4"/>,  color:"text-amber-600",   bg:"bg-amber-50"   },
]
const FIELD_MAP = Object.fromEntries(FIELD_TYPES.map(f => [f.type, f]))

/* ─── Status styles ──────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; bar: string }> = {
  TODO:        { label:"À faire",     bg:"bg-slate-100",  text:"text-slate-600",  bar:"#94a3b8" },
  IN_PROGRESS: { label:"En cours",    bg:"bg-blue-100",   text:"text-blue-700",   bar:"#3b82f6" },
  IN_REVIEW:   { label:"En révision", bg:"bg-amber-100",  text:"text-amber-700",  bar:"#f59e0b" },
  DONE:        { label:"Terminé",     bg:"bg-emerald-100",text:"text-emerald-700",bar:"#10b981" },
  BLOCKED:     { label:"Bloqué",      bg:"bg-red-100",    text:"text-red-700",    bar:"#ef4444" },
  ABANDONED:   { label:"Abandonné",   bg:"bg-slate-100",  text:"text-slate-400",  bar:"#d1d5db" },
}

/* ─── Priority config ─────────────────────────────── */
const PRI_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  LOW:      { label:"Faible",   color:"text-slate-400",  dot:"#94a3b8" },
  MEDIUM:   { label:"Moyen",    color:"text-blue-500",   dot:"#3b82f6" },
  HIGH:     { label:"Haute",    color:"text-amber-500",  dot:"#f59e0b" },
  CRITICAL: { label:"Critique", color:"text-red-500",    dot:"#ef4444" },
}

function getStatusCfg(id: string, statuses: StatusConfig[]) {
  const base = STATUS_CONFIG[id]
  if (base) return base
  const s = statuses.find(x => x.id === id)
  const colorMap: Record<string,{bg:string;text:string;bar:string}> = {
    slate:  { bg:"bg-slate-100",  text:"text-slate-600",  bar:"#94a3b8" },
    blue:   { bg:"bg-blue-100",   text:"text-blue-700",   bar:"#3b82f6" },
    amber:  { bg:"bg-amber-100",  text:"text-amber-700",  bar:"#f59e0b" },
    green:  { bg:"bg-emerald-100",text:"text-emerald-700",bar:"#10b981" },
    red:    { bg:"bg-red-100",    text:"text-red-700",    bar:"#ef4444" },
    purple: { bg:"bg-purple-100", text:"text-purple-700", bar:"#8b5cf6" },
    orange: { bg:"bg-orange-100", text:"text-orange-700", bar:"#f97316" },
  }
  const c = colorMap[s?.color ?? "slate"] ?? colorMap.slate
  return { label: s?.label ?? id, ...c }
}

/* ─── Avatar ──────────────────────────────────────── */
const AVATAR_COLORS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#3b82f6,#06b6d4)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#f59e0b,#f97316)",
  "linear-gradient(135deg,#ec4899,#8b5cf6)",
]
function AvatarInitials({ name, size = 22 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()
  const grad = AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: grad, display:"flex", alignItems:"center", justifyContent:"center", fontSize: size * 0.38, fontWeight:700, color:"white", flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.15)" }}>
      {initials}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
interface Props {
  projectId: string; projectName?: string; tasks: Task[]; statuses: StatusConfig[]
  customColumns: CustomColumn[]; members: Member[]
}

export function TachesTableau({ projectId, projectName, tasks, statuses, customColumns: init, members }: Props) {
  const router                      = useRouter()
  const [cols, setCols]             = useState<CustomColumn[]>(init)
  const [expanded, setExpanded]     = useState<Record<string,boolean>>({})
  const [projectCollapsed, setProjectCollapsed] = useState(false)
  const [selectedTask, setSelectedTask]         = useState<any | null>(null)
  const [loadingTaskId, setLoadingTaskId]       = useState<string | null>(null)
  const [addOpen, setAddOpen]       = useState(false)
  const [editingCol, setEditingCol] = useState<CustomColumn|null>(null)
  const [newCol, setNewCol]         = useState<{name:string;type:ColumnType;options:string[]}>({name:"",type:"text",options:[]})
  const [optionInput, setOptionInput] = useState("")
  const [editCell, setEditCell]     = useState<{taskId:string;colId:string}|null>(null)
  const [cellVal, setCellVal]       = useState<any>("")
  const [headerEdit, setHeaderEdit] = useState<string|null>(null)
  const [headerVal, setHeaderVal]   = useState("")
  const headerInputRef              = useRef<HTMLInputElement>(null)

  /* ── Column widths (resizable) ── */
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    __task: 260, __status: 110, __priority: 100,
    __assigneeId: 140, __startDate: 100, __dueDate: 100, __estimatedHours: 80,
  })
  const resizingRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(null)

  function startResize(e: React.MouseEvent, colId: string) {
    e.preventDefault()
    e.stopPropagation()
    const startWidth = colWidths[colId] ?? 120
    resizingRef.current = { colId, startX: e.clientX, startWidth }
    function onMove(ev: MouseEvent) {
      if (!resizingRef.current) return
      const newW = Math.max(60, resizingRef.current.startWidth + ev.clientX - resizingRef.current.startX)
      setColWidths(w => ({ ...w, [resizingRef.current!.colId]: newW }))
    }
    function onUp() { resizingRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  /* ── Column reorder (custom cols) ── */
  const [dragColId, setDragColId] = useState<string | null>(null)
  const [dropColId, setDropColId] = useState<string | null>(null)

  async function reorderCols(fromId: string, toId: string) {
    const from = cols.findIndex(c => c.id === fromId)
    const to   = cols.findIndex(c => c.id === toId)
    if (from === -1 || to === -1 || from === to) return
    const next = [...cols]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    await saveCols(next)
  }

  const allFlat = [...tasks, ...tasks.flatMap(t => t.children)]
  const allLight = allFlat.map(t => ({ id: t.id, title: t.title, isMilestone: !!(t as any).isMilestone, parentId: (t as any).parentId ?? null }))

  /* ── Drag & drop state ── */
  const [dragId,    setDragId]    = useState<string | null>(null)
  const [dropInfo,  setDropInfo]  = useState<{ id: string; pos: "before" | "after" | "inside" } | null>(null)

  function isDescendant(ancestorId: string, nodeId: string): boolean {
    const node = allFlat.find(t => t.id === nodeId) as any
    if (!node || !node.parentId) return false
    if (node.parentId === ancestorId) return true
    return isDescendant(ancestorId, node.parentId)
  }

  async function executeMove(taskId: string, target: any, pos: "before" | "after" | "inside") {
    let newParentId: string | null = null
    let newSortOrder = 0

    if (pos === "inside") {
      // Reparent: become child of target
      newParentId = target.id
      const existingChildren = allFlat.filter(t => (t as any).parentId === target.id)
      newSortOrder = existingChildren.length * 1000
    } else {
      // Reorder: same level as target
      newParentId = (target as any).parentId ?? null
      const siblings = allFlat
        .filter(t => ((t as any).parentId ?? null) === newParentId && t.id !== taskId)
      const targetIdx = siblings.findIndex(t => t.id === target.id)
      const insertIdx = pos === "before" ? targetIdx : targetIdx + 1
      newSortOrder = insertIdx * 1000
    }

    await fetch(`/api/projets/${projectId}/taches/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: newParentId, sortOrder: newSortOrder }),
    })
    router.refresh()
  }

  function onRowDragOver(e: React.DragEvent<HTMLTableRowElement>, task: any) {
    e.preventDefault()
    if (!dragId || dragId === task.id || isDescendant(dragId, task.id)) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height
    // Only top-level non-milestone tasks can receive children
    const canBeParent = !(task as any).isMilestone && !((task as any).parentId)
    let pos: "before" | "after" | "inside"
    if (canBeParent && y > h * 0.3 && y < h * 0.7) {
      pos = "inside"
    } else {
      pos = y < h * 0.5 ? "before" : "after"
    }
    setDropInfo({ id: task.id, pos })
  }

  /* ── Open task detail panel ── */
  async function openTask(taskId: string) {
    setLoadingTaskId(taskId)
    const res = await fetch(`/api/projets/${projectId}/taches/${taskId}`)
    if (res.ok) setSelectedTask(await res.json())
    setLoadingTaskId(null)
  }

  function handleTaskUpdated(updated: any) {
    setSelectedTask(updated)
    router.refresh()
  }

  /* ── Column persistence ── */
  async function saveCols(updated: CustomColumn[]) {
    setCols(updated)
    await fetch(`/api/projets/${projectId}/config`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ customColumns: updated }),
    })
    router.refresh()
  }

  function openAdd()  { setNewCol({name:"",type:"text",options:[]}); setOptionInput(""); setEditingCol(null); setAddOpen(true) }
  function openEdit(col: CustomColumn) { setNewCol({name:col.name,type:col.type,options:col.options??[]}); setOptionInput(""); setEditingCol(col); setAddOpen(true) }

  async function confirmCol() {
    if (!newCol.name.trim()) return
    const col: CustomColumn = { id: editingCol?.id ?? crypto.randomUUID(), name: newCol.name.trim(), type: newCol.type, options: newCol.options }
    const updated = editingCol ? cols.map(c => c.id===editingCol.id ? col : c) : [...cols, col]
    setAddOpen(false)
    await saveCols(updated)
  }
  async function deleteCol(id: string) { await saveCols(cols.filter(c => c.id!==id)) }

  function startHeaderEdit(col: CustomColumn) {
    setHeaderEdit(col.id); setHeaderVal(col.name)
    setTimeout(()=>headerInputRef.current?.focus(), 50)
  }
  async function commitHeader(id: string) {
    if (!headerVal.trim()) { setHeaderEdit(null); return }
    await saveCols(cols.map(c => c.id===id ? {...c, name: headerVal.trim()} : c))
    setHeaderEdit(null)
  }

  const saveField = useCallback(async (taskId: string, colId: string, value: any) => {
    let body: Record<string,any>
    if (colId.startsWith("__")) {
      const field = colId.replace("__","")
      if (field==="startDate" || field==="dueDate")
        body = { [field]: value ? new Date(value).toISOString() : null }
      else if (field==="estimatedHours")
        body = { estimatedHours: value ? parseFloat(value) : null }
      else if (field==="assigneeId")
        body = { assigneeId: value==="none" ? null : value }
      else
        body = { [field]: value }
    } else {
      const task = allFlat.find(t => t.id===taskId)
      const cur  = (task?.customData as Record<string,any>) ?? {}
      body = { customData: {...cur, [colId]: value} }
    }
    await fetch(`/api/projets/${projectId}/taches/${taskId}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(body),
    })
    setEditCell(null)
    router.refresh()
  }, [projectId, allFlat, router])

  /* ── Built-in cell ── */
  function renderBuiltin(task: any, colId: string) {
    const isEd = editCell?.taskId===task.id && editCell?.colId===colId

    if (colId==="__status") {
      const cfg = getStatusCfg(task.status, statuses)
      if (isEd) return (
        <Select value={task.status} onValueChange={v=>saveField(task.id,"__status",v)}>
          <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue/></SelectTrigger>
          <SelectContent>
            {statuses.map(st=>{
              const c = getStatusCfg(st.id, statuses)
              return <SelectItem key={st.id} value={st.id}><span className={`text-xs px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.label}</span></SelectItem>
            })}
          </SelectContent>
        </Select>
      )
      return (
        <div className="cursor-pointer" onClick={()=>setEditCell({taskId:task.id,colId:"__status"})}>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
        </div>
      )
    }

    if (colId==="__priority") {
      const p = PRI_CONFIG[task.priority] ?? PRI_CONFIG.MEDIUM
      if (isEd) return (
        <Select value={task.priority} onValueChange={v=>saveField(task.id,"__priority",v)}>
          <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue/></SelectTrigger>
          <SelectContent>
            {Object.entries(PRI_CONFIG).map(([k,v])=>(
              <SelectItem key={k} value={k}><span className={`text-xs font-medium ${v.color}`}>● {v.label}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
      return (
        <div className="cursor-pointer flex items-center gap-1" onClick={()=>setEditCell({taskId:task.id,colId:"__priority"})}>
          <Flag className={`h-3 w-3 ${p.color}`} style={{ fill: p.dot, opacity:0.8 }} />
          <span className={`text-xs font-medium ${p.color}`}>{p.label}</span>
        </div>
      )
    }

    if (colId==="__assigneeId") {
      if (isEd) return (
        <Select value={task.assigneeId??"none"} onValueChange={v=>saveField(task.id,"__assigneeId",v)}>
          <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue placeholder="Non assigné"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Non assigné</SelectItem>
            {members.map(m=><SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )
      return (
        <div className="cursor-pointer flex items-center gap-1.5" onClick={()=>setEditCell({taskId:task.id,colId:"__assigneeId"})}>
          {task.assignee?.name
            ? <><AvatarInitials name={task.assignee.name} size={20} /><span className="text-xs text-slate-600 truncate max-w-[80px]">{task.assignee.name.split(" ")[0]}</span></>
            : <span className="text-xs text-slate-300 italic">Non assigné</span>}
        </div>
      )
    }

    if (colId==="__startDate" || colId==="__dueDate") {
      const field = colId==="__startDate" ? "startDate" : "dueDate"
      const val = task[field]
      const overdue = field==="dueDate" && val && new Date(val)<new Date() && task.status!=="DONE"
      const initDate = val ? new Date(val).toISOString().split("T")[0] : ""
      if (isEd) return (
        <Input type="date" defaultValue={initDate} autoFocus className="h-7 text-xs w-[130px]"
          onChange={e=>setCellVal(e.target.value)}
          onBlur={()=>saveField(task.id,colId,cellVal||null)}
          onKeyDown={e=>{ if(e.key==="Enter") saveField(task.id,colId,cellVal||null); if(e.key==="Escape") setEditCell(null) }}
        />
      )
      return (
        <div className="cursor-pointer" onClick={()=>{ setEditCell({taskId:task.id,colId}); setCellVal(initDate) }}>
          <span className={`text-xs ${overdue?"text-red-500 font-semibold":"text-slate-500"}`}>
            {val ? new Date(val).toLocaleDateString("fr-CA",{month:"short",day:"numeric"}) : <span className="text-slate-300">—</span>}
            {overdue && " ⚠"}
          </span>
        </div>
      )
    }

    if (colId==="__estimatedHours") {
      if (isEd) return (
        <Input type="number" step="0.5" min="0" defaultValue={task.estimatedHours??""} autoFocus className="h-7 text-xs w-[80px]"
          onChange={e=>setCellVal(e.target.value)}
          onBlur={()=>saveField(task.id,"__estimatedHours",cellVal)}
          onKeyDown={e=>{ if(e.key==="Enter") saveField(task.id,"__estimatedHours",cellVal); if(e.key==="Escape") setEditCell(null) }}
        />
      )
      return (
        <div className="cursor-pointer text-right" onClick={()=>{ setEditCell({taskId:task.id,colId:"__estimatedHours"}); setCellVal(String(task.estimatedHours??"")) }}>
          <span className="text-xs text-slate-500">{task.estimatedHours ? `${task.estimatedHours}h` : <span className="text-slate-300">—</span>}</span>
        </div>
      )
    }
    return null
  }

  /* ── Custom column cell ── */
  function renderCustom(task: any, col: CustomColumn) {
    const data = (task.customData as Record<string,any>) ?? {}
    const val  = data[col.id]
    const isEd = editCell?.taskId===task.id && editCell?.colId===col.id

    if ((col.type as string)==="progress") {
      const pct = Math.min(100,Math.max(0,Number(val)||0))
      if (isEd) return (
        <Input type="number" min="0" max="100" defaultValue={pct} autoFocus className="h-7 text-xs w-[70px]"
          onChange={e=>setCellVal(e.target.value)}
          onBlur={()=>saveField(task.id,col.id,Number(cellVal)||0)}
          onKeyDown={e=>{ if(e.key==="Enter") saveField(task.id,col.id,Number(cellVal)||0); if(e.key==="Escape") setEditCell(null) }}
        />
      )
      return (
        <div className="flex items-center gap-2 min-w-[100px] cursor-pointer" onClick={()=>{ setEditCell({taskId:task.id,colId:col.id}); setCellVal(String(pct)) }}>
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{width:`${pct}%`,background:"linear-gradient(90deg,#6366f1,#8b5cf6)"}}/>
          </div>
          <span className="text-xs text-slate-500 w-7 shrink-0 text-right">{pct}%</span>
        </div>
      )
    }
    if (isEd) {
      if (col.type==="checkbox") return <input type="checkbox" checked={!!val} autoFocus onChange={e=>saveField(task.id,col.id,e.target.checked)} onBlur={()=>setEditCell(null)} className="h-4 w-4"/>
      if (col.type==="select"&&col.options?.length) return (
        <Select value={val??"none"} onValueChange={v=>saveField(task.id,col.id,v==="none"?null:v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Choisir…"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {col.options.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      )
      if (col.type==="labels"&&col.options?.length) {
        const cur: string[] = Array.isArray(val)?val:[]
        return (
          <div className="flex flex-wrap gap-1">
            {col.options.map(o=>(
              <button key={o} onClick={()=>{ const next=cur.includes(o)?cur.filter(x=>x!==o):[...cur,o]; saveField(task.id,col.id,next) }}
                className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${cur.includes(o)?"bg-primary text-primary-foreground border-primary":"border-slate-200 hover:bg-slate-50"}`}>{o}</button>
            ))}
          </div>
        )
      }
      if (col.type==="people") return (
        <Select value={val??"none"} onValueChange={v=>saveField(task.id,col.id,v==="none"?null:v)}>
          <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue placeholder="—"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {members.map(m=><SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )
      if (col.type==="longtext") return <Textarea autoFocus defaultValue={val??""} rows={2} className="text-xs"
        onChange={e=>setCellVal(e.target.value)} onBlur={()=>saveField(task.id,col.id,cellVal||null)}/>
      return (
        <Input type={col.type==="date"?"date":col.type==="number"||col.type==="money"?"number":"text"}
          defaultValue={col.type==="date"&&val?new Date(val).toISOString().split("T")[0]:(val??"")}
          autoFocus className="h-7 text-xs px-1.5 w-full min-w-[110px]"
          onChange={e=>setCellVal(e.target.value)}
          onBlur={()=>saveField(task.id,col.id,col.type==="number"||col.type==="money"?(parseFloat(cellVal)||null):(cellVal||null))}
          onKeyDown={e=>{ if(e.key==="Enter") saveField(task.id,col.id,col.type==="number"||col.type==="money"?(parseFloat(cellVal)||null):(cellVal||null)); if(e.key==="Escape") setEditCell(null) }}
        />
      )
    }
    // display
    const display = () => {
      if (!val&&val!==0&&val!==false) return <span className="text-slate-300 text-xs">—</span>
      if (col.type==="checkbox") return val?<Check className="h-3.5 w-3.5 text-emerald-500"/>:<X className="h-3.5 w-3.5 text-slate-300"/>
      if (col.type==="date")     return <span className="text-xs">{new Date(val).toLocaleDateString("fr-CA")}</span>
      if (col.type==="money")    return <span className="text-xs font-semibold text-emerald-600">{Number(val).toLocaleString("fr-CA",{style:"currency",currency:"CAD"})}</span>
      if (col.type==="url")      return <a href={val} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate max-w-[120px] block">{val}</a>
      if (col.type==="email")    return <a href={`mailto:${val}`} className="text-xs text-orange-500 hover:underline">{val}</a>
      if (col.type==="phone")    return <a href={`tel:${val}`} className="text-xs text-rose-500 hover:underline">{val}</a>
      if (col.type==="labels")   return <div className="flex flex-wrap gap-0.5">{(Array.isArray(val)?val:[val]).map((l:string)=><span key={l} className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full">{l}</span>)}</div>
      if (col.type==="people")   return <span className="text-xs text-slate-600">{members.find(m=>m.id===val)?.name??val}</span>
      if (col.type==="longtext") return <span className="text-xs line-clamp-1 max-w-[140px] text-slate-600">{val}</span>
      return <span className="text-xs text-slate-600">{val}</span>
    }
    return (
      <div className="cursor-pointer hover:bg-slate-50 px-1.5 py-1 rounded min-h-[22px] min-w-[60px] transition-colors"
        onClick={()=>{ setEditCell({taskId:task.id,colId:col.id}); setCellVal(col.type==="date"&&val?new Date(val).toISOString().split("T")[0]:(val??"")) }}>
        {display()}
      </div>
    )
  }

  /* ── Tree Row ── */
  function renderRow(task: any, depth=0, isLast=false, parentLines: boolean[]=[]) {
    const hasChildren = !task.isMilestone && (task.children?.length ?? 0) > 0
    const isExpanded  = expanded[task.id] !== false
    const cfg = getStatusCfg(task.status, statuses)
    const isDragging  = dragId === task.id
    const di          = dropInfo?.id === task.id ? dropInfo : null

    const rowStyle: React.CSSProperties = {
      borderLeft: `3px solid ${cfg.bar}`,
      opacity: isDragging ? 0.35 : 1,
      transition: "opacity 0.15s, box-shadow 0.1s, background 0.1s",
      ...(di?.pos === "before"  ? { boxShadow: "inset 0 2px 0 #6366f1" } : {}),
      ...(di?.pos === "after"   ? { boxShadow: "inset 0 -2px 0 #6366f1" } : {}),
      ...(di?.pos === "inside"  ? { background: "#eef2ff" } : {}),
    }

    return (
      <React.Fragment key={task.id}>
        {/* ── Row ── */}
        <tr
          draggable
          className="group hover:bg-blue-50/30 transition-colors"
          style={rowStyle}
          onDragStart={e => { setDragId(task.id); e.dataTransfer.effectAllowed = "move" }}
          onDragEnd={() => { setDragId(null); setDropInfo(null) }}
          onDragOver={e => onRowDragOver(e, task)}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropInfo(null) }}
          onDrop={e => { e.preventDefault(); if (dragId && di) executeMove(dragId, task, di.pos); setDropInfo(null) }}
        >

          {/* Drag handle */}
          <td className="px-1 py-0 w-5 cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </td>

          {/* Title cell with tree */}
          <td className="px-0 py-1">
            <div className="flex items-center min-h-[40px] pr-3 relative flex-wrap">
              {/* Tree connector lines */}
              {depth > 0 && (
                <div className="flex shrink-0" style={{ width: depth * 20 }}>
                  {parentLines.map((hasLine, li) => (
                    <div key={li} style={{ width: 20, height: 40, position:"relative", flexShrink:0 }}>
                      {hasLine && (
                        <div style={{ position:"absolute", left: 9, top: 0, bottom: 0, width: 1, background:"#e2e8f0" }} />
                      )}
                    </div>
                  ))}
                  {/* Elbow connector */}
                  <div style={{ width: 20, height: 40, position:"relative", flexShrink:0 }}>
                    {!isLast && <div style={{ position:"absolute", left: 9, top: 0, bottom: 0, width: 1, background:"#e2e8f0" }} />}
                    <div style={{ position:"absolute", left: 9, top: 20, width: 11, height: 1, background:"#e2e8f0" }} />
                  </div>
                </div>
              )}

              {/* Expand toggle */}
              <div style={{ width: 20, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {hasChildren ? (
                  <button
                    onClick={() => setExpanded(e => ({ ...e, [task.id]: !isExpanded }))}
                    className="rounded hover:bg-slate-200 transition-colors p-0.5"
                  >
                    {isExpanded
                      ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                  </button>
                ) : (
                  <div className="w-4" />
                )}
              </div>

              {/* Vertical line below expand button (for expanded parent) */}
              {hasChildren && isExpanded && depth === 0 && (
                <div style={{
                  position:"absolute",
                  left: depth * 20 + 29,
                  top: 40, bottom: 0,
                  width: 1, background:"#e2e8f0",
                  pointerEvents:"none",
                }} />
              )}

              {/* Task icon */}
              <div style={{ marginRight: 6, flexShrink:0 }}>
                {task.isMilestone
                  ? <Diamond className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                  : depth > 0
                  ? <div style={{ width:8, height:8, borderRadius:2, border:`2px solid ${cfg.bar}`, flexShrink:0 }} />
                  : <div style={{ width:10, height:10, borderRadius:3, background:cfg.bar, flexShrink:0, boxShadow:`0 1px 3px ${cfg.bar}60` }} />
                }
              </div>

              {/* Title — clickable */}
              <button
                onClick={() => openTask(task.id)}
                className={`text-sm text-left break-words hover:underline transition-colors flex-1 min-w-0 ${task.isMilestone ? "text-amber-700 font-semibold" : depth > 0 ? "text-slate-600 hover:text-indigo-600" : "text-slate-800 font-medium hover:text-indigo-700"} ${task.status==="DONE" ? "line-through opacity-60" : ""}`}
              >
                {loadingTaskId === task.id
                  ? <span className="flex items-center gap-1"><span className="h-3 w-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin inline-block"/>{task.title}</span>
                  : task.title}
              </button>

              {/* Badges */}
              <div className="flex items-center gap-1 ml-2 shrink-0">
                {task.isRDEligible && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold border border-emerald-200">RS&DE</span>
                )}
                {hasChildren && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">{task.children.length}</span>
                )}
              </div>
            </div>
          </td>

          {/* Status */}
          <td className="px-3 py-0 whitespace-nowrap">
            {renderBuiltin(task, "__status")}
          </td>

          {/* Priority */}
          <td className="px-3 py-0 whitespace-nowrap">
            {renderBuiltin(task, "__priority")}
          </td>

          {/* Assignee */}
          <td className="px-3 py-0">
            {renderBuiltin(task, "__assigneeId")}
          </td>

          {/* Start date */}
          <td className="px-3 py-0 whitespace-nowrap">
            {renderBuiltin(task, "__startDate")}
          </td>

          {/* Due date */}
          <td className="px-3 py-0 whitespace-nowrap">
            {renderBuiltin(task, "__dueDate")}
          </td>

          {/* Hours */}
          <td className="px-3 py-0">
            {renderBuiltin(task, "__estimatedHours")}
          </td>

          {/* Custom columns */}
          {cols.map(col => (
            <td key={col.id} className="px-3 py-0 min-w-[100px]">
              {renderCustom(task, col)}
            </td>
          ))}

          <td />
        </tr>

        {/* Children */}
        {hasChildren && isExpanded && task.children?.map((c: any, ci: number) => {
          const childIsLast = ci === task.children.length - 1
          const childParentLines = [...parentLines, depth === 0 ? false : !isLast]
          return renderRow(c, depth + 1, childIsLast, childParentLines)
        })}
      </React.Fragment>
    )
  }

  /* ─── RENDER ─────────────────────────────────── */
  // Exclude milestone tasks — they appear in the Jalons tab
  const regularTasks = tasks.filter(t => !(t as any).isMilestone)
  const totalTasks   = regularTasks.reduce((acc, t) => acc + 1 + (t.children?.length ?? 0), 0)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white select-none">
        <table className="w-full text-sm border-collapse" style={{ tableLayout: "fixed" }}>

          {/* Header */}
          <thead>
            <tr style={{ background:"linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)", borderBottom:"2px solid #e2e8f0" }}>
              {/* Drag handle col */}
              <th className="w-5 px-1 shrink-0" />

              {/* Task name — resizable */}
              <th className="px-3 py-3 text-left relative" style={{ width: colWidths.__task, minWidth: 100 }}>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tâche</span>
                <div onMouseDown={e => startResize(e, "__task")}
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-400 rounded-r transition-colors" />
              </th>

              {/* Built-in resizable columns */}
              {([
                { id:"__status",        l:"Statut"   },
                { id:"__priority",      l:"Priorité" },
                { id:"__assigneeId",    l:"Assigné"  },
                { id:"__startDate",     l:"Début"    },
                { id:"__dueDate",       l:"Échéance" },
                { id:"__estimatedHours",l:"Heures"   },
              ] as const).map(h => (
                <th key={h.id} className="px-3 py-3 text-left relative whitespace-nowrap"
                  style={{ width: colWidths[h.id], minWidth: 60 }}>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{h.l}</span>
                  <div onMouseDown={e => startResize(e, h.id)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-400 rounded-r transition-colors" />
                </th>
              ))}

              {/* Custom columns — resizable + draggable to reorder */}
              {cols.map(col => {
                const ft = FIELD_MAP[col.type]
                const isDragOver = dropColId === col.id && dragColId !== col.id
                return (
                  <th key={col.id}
                    draggable
                    onDragStart={e => { e.stopPropagation(); setDragColId(col.id); e.dataTransfer.effectAllowed = "move" }}
                    onDragEnd={() => { setDragColId(null); setDropColId(null) }}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropColId(col.id) }}
                    onDragLeave={() => setDropColId(null)}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); if (dragColId && dragColId !== col.id) reorderCols(dragColId, col.id); setDropColId(null) }}
                    className="px-3 py-2 text-left relative group/col transition-colors"
                    style={{
                      width: colWidths[col.id] ?? 120, minWidth: 60,
                      borderLeft: isDragOver ? "2px solid #6366f1" : undefined,
                      background: dragColId === col.id ? "#f0f0ff" : undefined,
                      cursor: "grab",
                    }}>
                    <div className="flex items-center gap-1.5">
                      {headerEdit === col.id ? (
                        <input ref={headerInputRef} value={headerVal} onChange={e=>setHeaderVal(e.target.value)}
                          onBlur={()=>commitHeader(col.id)}
                          onKeyDown={e=>{if(e.key==="Enter")commitHeader(col.id);if(e.key==="Escape")setHeaderEdit(null)}}
                          className="text-xs font-bold border-b border-primary bg-transparent outline-none w-full text-slate-500 uppercase tracking-wider"/>
                      ) : (
                        <>
                          <GripVertical className="h-3 w-3 text-slate-300 shrink-0" />
                          <span className={`shrink-0 ${ft?.color}`}>{ft?.icon}</span>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 transition-colors"
                            onClick={e=>{e.stopPropagation();startHeaderEdit(col)}}>{col.name}</span>
                          <span className="opacity-0 group-hover/col:opacity-100 transition-opacity flex gap-0.5 ml-1">
                            <button onClick={e=>{e.stopPropagation();openEdit(col)}} className="text-slate-400 hover:text-slate-700 p-0.5 rounded"><Pencil className="h-3 w-3"/></button>
                            <button onClick={e=>{e.stopPropagation();deleteCol(col.id)}} className="text-slate-400 hover:text-red-500 p-0.5 rounded"><Trash2 className="h-3 w-3"/></button>
                          </span>
                        </>
                      )}
                    </div>
                    <div onMouseDown={e => startResize(e, col.id)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-400 rounded-r transition-colors" />
                  </th>
                )
              })}

              <th className="px-2 py-2">
                <button onClick={openAdd}
                  className="flex items-center justify-center h-7 w-7 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{ background:"linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)", boxShadow:"0 3px 10px rgba(99,102,241,0.4),inset 0 1px 0 rgba(255,255,255,0.2)" }}
                  title="Ajouter une colonne">
                  <Plus className="h-3.5 w-3.5 text-white" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {/* ── Project header row ── */}
            {projectName && (
              <tr style={{ background:"linear-gradient(135deg,#f8fafc,#eef2ff)", borderBottom:"2px solid #e0e7ff" }}>
                <td colSpan={10 + cols.length + 1} className="px-3 py-2.5">
                  <button
                    onClick={() => setProjectCollapsed(c => !c)}
                    className="flex items-center gap-2.5 w-full text-left group"
                  >
                    <div className="p-1.5 rounded-lg shrink-0" style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow:"0 2px 8px rgba(99,102,241,0.3)" }}>
                      <FolderKanban className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-bold text-slate-700 text-sm">{projectName}</span>
                    <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-semibold">
                      {totalTasks} tâche{totalTasks !== 1 ? "s" : ""}
                    </span>
                    <div className="ml-auto flex items-center gap-1 text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
                      {projectCollapsed
                        ? <><ChevronRight className="h-4 w-4" /> Déplier</>
                        : <><ChevronDown className="h-4 w-4" /> Replier</>}
                    </div>
                  </button>
                </td>
              </tr>
            )}

            {/* ── Task rows ── */}
            {!projectCollapsed && (
              regularTasks.length === 0 ? (
                <tr>
                  <td colSpan={10 + cols.length} className="text-center py-16 text-slate-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <CheckSquare className="h-8 w-8 text-slate-300" />
                      <span>Aucune tâche. Créez votre première tâche !</span>
                    </div>
                  </td>
                </tr>
              ) : regularTasks.map((t, i) => renderRow(t as any, 0, i === regularTasks.length - 1, []))
            )}
          </tbody>
        </table>
      </div>

      {/* Task detail panel */}
      <TaskDetailPanel
        task={selectedTask}
        allTasks={allLight}
        projectId={projectId}
        members={members}
        onClose={() => setSelectedTask(null)}
        onUpdated={handleTaskUpdated}
      />

      {/* Dialog colonne */}
      <Dialog open={addOpen} onOpenChange={v=>{setAddOpen(v);if(!v){setEditingCol(null);setOptionInput("")}}}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingCol?"Modifier la colonne":"Nouvelle colonne"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="space-y-1.5">
              <Label>Nom de la colonne</Label>
              <Input placeholder="Ex: Date de début réelle" value={newCol.name} onChange={e=>setNewCol(c=>({...c,name:e.target.value}))} autoFocus/>
            </div>
            <div className="space-y-2">
              <Label>Type de champ</Label>
              <div className="grid grid-cols-3 gap-2">
                {FIELD_TYPES.map(ft=>(
                  <button key={ft.type} type="button" onClick={()=>setNewCol(c=>({...c,type:ft.type}))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 active:scale-95 ${newCol.type===ft.type?"border-indigo-400":"border-slate-200 hover:border-slate-300"}`}
                    style={newCol.type===ft.type
                      ?{background:"linear-gradient(135deg,white,#f8f9ff)",boxShadow:"0 4px 12px rgba(99,102,241,0.18),inset 0 1px 0 rgba(255,255,255,0.9)"}
                      :{background:"linear-gradient(135deg,white,#fafafa)",boxShadow:"0 1px 3px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.8)"}}>
                    <span className={`${ft.bg} ${ft.color} p-1.5 rounded-lg shrink-0`} style={{boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
                      {ft.icon}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 leading-tight">{ft.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {(newCol.type==="select"||newCol.type==="labels")&&(
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex gap-2">
                  <Input placeholder="Ajouter une option…" value={optionInput} onChange={e=>setOptionInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&optionInput.trim()){setNewCol(c=>({...c,options:[...(c.options??[]),optionInput.trim()]}));setOptionInput("")}}}/>
                  <Button type="button" variant="outline" onClick={()=>{if(optionInput.trim()){setNewCol(c=>({...c,options:[...(c.options??[]),optionInput.trim()]}));setOptionInput("")}}}>
                    <Plus className="h-4 w-4"/>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {newCol.options?.map(o=>(
                    <span key={o} className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full">
                      {o}<button onClick={()=>setNewCol(c=>({...c,options:c.options?.filter(x=>x!==o)}))}><X className="h-3 w-3 hover:text-red-500"/></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={()=>setAddOpen(false)}>Annuler</Button>
              <Button onClick={confirmCol} disabled={!newCol.name.trim()}
                style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",boxShadow:"0 4px 12px rgba(99,102,241,0.35),inset 0 1px 0 rgba(255,255,255,0.15)"}}
                className="text-white border-0 hover:opacity-90">
                {editingCol?"Enregistrer":"Ajouter la colonne"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
