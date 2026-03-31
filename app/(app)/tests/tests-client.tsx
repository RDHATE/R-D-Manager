"use client"
import { useThemeColors } from "@/hooks/use-theme-colors"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Plus, FlaskConical, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  MinusCircle, Trash2, Pencil, Table2, Pencil as PencilIcon, Paperclip,
  Filter, Search, Clock, ExternalLink, X,
} from "lucide-react"
import { TableEditor, defaultTable, type TableData } from "@/components/eln/table-editor"
import { DrawingPad } from "@/components/eln/drawing-pad"
import { AttachmentZone, type PendingFile } from "@/components/eln/attachment-zone"

// ── Types ──────────────────────────────────────────────────────────────────────
type Attachment = { id: string; fileName: string; fileUrl: string; mimeType: string | null }
type TestExp = {
  id: string; title: string; objective: string
  parameters: string | null; protocol: string | null
  results: string | null; conclusion: string | null
  resultType: "CONCLUSIVE" | "NON_CONCLUSIVE" | "PARTIAL" | null
  structuredData: Record<string, any> | null
  project: { id: string; name: string; code: string }
  attachments: Attachment[]
  createdAt: string; updatedAt: string
}
type Project = { id: string; name: string; code: string }

// ── Config ─────────────────────────────────────────────────────────────────────
const RESULT_CFG = {
  CONCLUSIVE:     { label: "Concluant",     icon: CheckCircle2, color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)" },
  NON_CONCLUSIVE: { label: "Non concluant", icon: XCircle,      color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)" },
  PARTIAL:        { label: "Partiel",       icon: MinusCircle,  color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)" },
} as const

const SECTIONS = [
  { key: "objective",  label: "Objectif",              placeholder: "Que cherche-t-on à démontrer ou mesurer ?",       rows: 2 },
  { key: "parameters", label: "Paramètres / Variables", placeholder: "Variables, conditions, configuration, unités…",  rows: 2 },
  { key: "protocol",   label: "Protocole expérimental", placeholder: "Étapes suivies, méthode appliquée, équipement…", rows: 3 },
  { key: "results",    label: "Résultats observés",     placeholder: "Données mesurées, observations, valeurs brutes…", rows: 3 },
  { key: "conclusion", label: "Conclusion",             placeholder: "Interprétation, hypothèse validée ou réfutée…",  rows: 2 },
]


const EMPTY_FORM = {
  projectId: "", title: "", objective: "",
  parameters: "", protocol: "", results: "", conclusion: "",
  resultType: "",
}

// ── Composant principal ────────────────────────────────────────────────────────
interface Props { tests: TestExp[]; projects: Project[] }

export function TestsClient({ tests: initial, projects }: Props) {
  const dark = useThemeColors()
  const router  = useRouter()
  const [tests, setTests]           = useState<TestExp[]>(initial)
  const [showForm, setShowForm]     = useState(false)
  const [editTarget, setEditTarget] = useState<TestExp | null>(null)
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({})
  const [filterProject, setFilterProject] = useState("all")
  const [filterResult, setFilterResult]   = useState("all")
  const [search, setSearch]         = useState("")
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState("")
  const [form, setForm]             = useState(EMPTY_FORM)

  // Blocs optionnels
  const [showTable,   setShowTable]   = useState(false)
  const [tableData,   setTableData]   = useState<TableData>(defaultTable())
  const [showDrawing, setShowDrawing] = useState(false)
  const [drawing,     setDrawing_]    = useState<string | null>(null)
  const [newFiles,    setNewFiles]    = useState<PendingFile[]>([])

  // Pièces jointes existantes en mode édition
  const [savedAttachments, setSavedAttachments] = useState<Attachment[]>([])

  function setF(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }))
  }

  function resetBlocks() {
    setShowTable(false); setTableData(defaultTable())
    setShowDrawing(false); setDrawing_(null); setNewFiles([])
  }

  function openNew() {
    setEditTarget(null); setForm(EMPTY_FORM); setError("")
    resetBlocks(); setSavedAttachments([])
    setShowForm(true)
  }

  function openEdit(t: TestExp) {
    setEditTarget(t)
    setForm({
      projectId: t.project.id, title: t.title, objective: t.objective,
      parameters: t.parameters ?? "", protocol: t.protocol ?? "",
      results: t.results ?? "", conclusion: t.conclusion ?? "",
      resultType: t.resultType ?? "",
    })
    setError(""); resetBlocks()
    // Restaurer tableau et dessin si présents
    if (t.structuredData?._table) { setTableData(t.structuredData._table as TableData); setShowTable(true) }
    if (t.structuredData?._drawing) { setDrawing_(t.structuredData._drawing as string); setShowDrawing(true) }
    setSavedAttachments(t.attachments ?? [])
    setShowForm(true)
  }

  async function deleteAttachment(testId: string, attachId: string) {
    await fetch(`/api/tests/${testId}/attachments/${attachId}`, { method: "DELETE" }).catch(() => {})
    setSavedAttachments(p => p.filter(a => a.id !== attachId))
    setTests(prev => prev.map(t => t.id === testId
      ? { ...t, attachments: t.attachments.filter(a => a.id !== attachId) }
      : t))
  }

  async function handleSave() {
    if (!form.projectId || !form.title || !form.objective) {
      setError("Projet, titre et objectif requis."); return
    }
    setSaving(true); setError("")

    const extraData: Record<string, any> = {}
    if (showTable)            extraData._table   = tableData
    if (showDrawing && drawing) extraData._drawing = drawing

    const payload = {
      ...form,
      resultType:     form.resultType || null,
      parameters:     form.parameters || null,
      protocol:       form.protocol   || null,
      results:        form.results    || null,
      conclusion:     form.conclusion || null,
      structuredData: Object.keys(extraData).length > 0 ? extraData : null,
    }

    try {
      let saved: TestExp
      if (editTarget) {
        const res = await fetch(`/api/tests/${editTarget.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) { setError((await res.json()).error ?? "Erreur"); setSaving(false); return }
        saved = await res.json()
        setTests(p => p.map(t => t.id === editTarget.id ? { ...saved, attachments: savedAttachments } : t))
      } else {
        const res = await fetch("/api/tests", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) { setError((await res.json()).error ?? "Erreur"); setSaving(false); return }
        saved = await res.json()
        setTests(p => [{ ...saved, attachments: [] }, ...p])
      }

      // Upload pièces jointes
      const uploaded = newFiles.filter(f => f.uploaded)
      for (const pf of uploaded) {
        const res = await fetch(`/api/tests/${saved.id}/attachments`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: pf.file.name, fileUrl: pf.uploaded!, fileSize: pf.file.size, mimeType: pf.file.type }),
        }).catch(() => null)
        if (res?.ok) {
          const att = await res.json()
          setTests(prev => prev.map(t => t.id === saved.id ? { ...t, attachments: [...(t.attachments ?? []), att] } : t))
        }
      }

      setShowForm(false); setEditTarget(null); resetBlocks(); setForm(EMPTY_FORM)
      router.refresh()
    } catch { setError("Erreur réseau") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette expérience ?")) return
    await fetch(`/api/tests/${id}`, { method: "DELETE" })
    setTests(p => p.filter(t => t.id !== id))
  }

  const filtered = useMemo(() => tests.filter(t =>
    (filterProject === "all" || t.project.id === filterProject) &&
    (filterResult  === "all" || (filterResult === "none" ? !t.resultType : t.resultType === filterResult)) &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()) ||
     t.objective.toLowerCase().includes(search.toLowerCase()))
  ), [tests, filterProject, filterResult, search])

  const stats = useMemo(() => ({
    conclusive:    tests.filter(t => t.resultType === "CONCLUSIVE").length,
    nonConclusive: tests.filter(t => t.resultType === "NON_CONCLUSIVE").length,
    partial:       tests.filter(t => t.resultType === "PARTIAL").length,
    inProgress:    tests.filter(t => !t.resultType).length,
  }), [tests])

  return (
    <div style={{ minHeight: "100vh", background: dark.bg, padding: "28px 32px", color: dark.text }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: dark.text, letterSpacing: -0.5 }}>Tests & Expériences</h1>
          <p style={{ fontSize: 13, color: dark.sub, marginTop: 4 }}>
            Protocoles, données, résultats et conclusions — documentés pour RS&DE
          </p>
        </div>
        <button onClick={openNew} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 8, cursor: "pointer",
          background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
          border: "none", color: dark.text, fontSize: 13, fontWeight: 700,
          boxShadow: "0 4px 14px rgba(139,92,246,0.4)", transition: "all 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(139,92,246,0.5)" }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 14px rgba(139,92,246,0.4)" }}
        >
          <Plus size={15} /> Nouvelle expérience
        </button>
      </div>

      {/* ── Stats ── */}
      {tests.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          {[
            { key: "conclusive",    label: "Concluant",     color: "#10b981", count: stats.conclusive },
            { key: "nonConclusive", label: "Non concluant", color: "#ef4444", count: stats.nonConclusive },
            { key: "partial",       label: "Partiel",       color: "#f59e0b", count: stats.partial },
            { key: "inProgress",    label: "En cours",      color: dark.sub, count: stats.inProgress },
          ].filter(s => s.count > 0).map(s => (
            <span key={s.key} style={{
              fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 10,
              background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}40`,
            }}>
              {s.count} {s.label.toLowerCase()}
            </span>
          ))}
        </div>
      )}

      {/* ── Filtres ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        background: dark.card, borderRadius: 10, padding: "10px 14px",
        border: `1px solid ${dark.border}`, marginBottom: 22,
      }}>
        <Filter size={14} style={{ color: dark.muted }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 140 }}>
          <Search size={13} style={{ color: dark.muted }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ background: "none", border: "none", outline: "none", color: dark.text, fontSize: 13, width: "100%" }} />
        </div>
        <div style={{ width: 1, height: 18, background: dark.border }} />
        {projects.length > 1 && (
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.sub, width: 180, height: 32, fontSize: 12 }}>
              <SelectValue placeholder="Tous les projets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les projets</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterResult} onValueChange={setFilterResult}>
          <SelectTrigger style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.sub, width: 160, height: 32, fontSize: 12 }}>
            <SelectValue placeholder="Tous les résultats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="none">En cours</SelectItem>
            <SelectItem value="CONCLUSIVE">Concluant</SelectItem>
            <SelectItem value="NON_CONCLUSIVE">Non concluant</SelectItem>
            <SelectItem value="PARTIAL">Partiel</SelectItem>
          </SelectContent>
        </Select>
        <span style={{ fontSize: 12, color: dark.muted, marginLeft: "auto", fontWeight: 600 }}>
          {filtered.length} expérience{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Formulaire panel ── */}
      {showForm && (
        <div style={{
          background: dark.card, borderRadius: 14, padding: 24,
          border: `1px solid ${dark.accent}44`,
          marginBottom: 24,
          boxShadow: `0 0 0 1px ${dark.accent}22, 0 8px 32px rgba(0,0,0,0.4)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <FlaskConical size={16} style={{ color: dark.accent }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: dark.accent }}>
              {editTarget ? "Modifier l'expérience" : "Nouvelle expérience"}
            </span>
          </div>

          {/* Projet + titre */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Projet *</label>
              <Select value={form.projectId} onValueChange={v => setForm(p => ({ ...p, projectId: v }))} disabled={!!editTarget}>
                <SelectTrigger style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }}>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Titre *</label>
              <Input value={form.title} onChange={setF("title")} placeholder="Ex: Test algorithme v2 sur jeu de données A"
                style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }} />
            </div>
          </div>

          {/* Sections texte */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            {SECTIONS.map(s => (
              <div key={s.key}>
                <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 5, letterSpacing: 0.3 }}>
                  {s.label}{s.key === "objective" ? " *" : ""}
                </label>
                <Textarea rows={s.rows} value={(form as any)[s.key]} onChange={setF(s.key)}
                  placeholder={s.placeholder}
                  style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, resize: "vertical" }} />
              </div>
            ))}
          </div>

          {/* Résultat */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Résultat</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { v: "", label: "En cours", color: dark.sub },
                { v: "CONCLUSIVE",     label: "Concluant",     color: "#10b981" },
                { v: "NON_CONCLUSIVE", label: "Non concluant", color: "#ef4444" },
                { v: "PARTIAL",        label: "Partiel",       color: "#f59e0b" },
              ].map(opt => (
                <button key={opt.v} onClick={() => setForm(p => ({ ...p, resultType: opt.v }))}
                  style={{
                    padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
                    background: form.resultType === opt.v ? `${opt.color}20` : dark.hover,
                    border: form.resultType === opt.v ? `2px solid ${opt.color}` : `1px solid ${dark.border}`,
                    color: form.resultType === opt.v ? opt.color : dark.muted, transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = opt.color; e.currentTarget.style.color = opt.color }}
                  onMouseLeave={e => {
                    if (form.resultType !== opt.v) {
                      e.currentTarget.style.borderColor = dark.border
                      e.currentTarget.style.color = dark.muted
                    }
                  }}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {/* ── Blocs optionnels ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={() => setShowTable(p => !p)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 7, cursor: "pointer",
              background: showTable ? "rgba(99,102,241,0.2)" : dark.hover,
              border: showTable ? "1px solid #6366f1" : `1px solid ${dark.border}`,
              color: showTable ? "#818cf8" : dark.muted, fontSize: 12, fontWeight: 600, transition: "all 0.15s",
            }}><Table2 size={13} /> Tableur de données</button>
            <button onClick={() => setShowDrawing(p => !p)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 7, cursor: "pointer",
              background: showDrawing ? "rgba(139,92,246,0.2)" : dark.hover,
              border: showDrawing ? "1px solid #8b5cf6" : `1px solid ${dark.border}`,
              color: showDrawing ? "#a78bfa" : dark.muted, fontSize: 12, fontWeight: 600, transition: "all 0.15s",
            }}><PencilIcon size={13} /> Bloc-notes / Dessin</button>
          </div>

          {showTable && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Tableau de données</label>
              <TableEditor value={tableData} onChange={setTableData} />
            </div>
          )}
          {showDrawing && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Bloc-notes / Dessin</label>
              <DrawingPad value={drawing} onChange={setDrawing_} />
            </div>
          )}

          {/* Pièces jointes existantes (edit) */}
          {editTarget && savedAttachments.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "#34d399", fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Pièces jointes existantes</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {savedAttachments.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 7, background: dark.card, border: `1px solid ${dark.border}` }}>
                    <Paperclip size={12} style={{ color: "#34d399" }} />
                    <span style={{ flex: 1, fontSize: 12, color: dark.text }}>{a.fileName}</span>
                    <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: dark.sub }}><ExternalLink size={12} /></a>
                    <button onClick={() => deleteAttachment(editTarget.id, a.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: dark.muted }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#475569")}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nouvelles pièces jointes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: "#34d399", fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {editTarget ? "Ajouter des pièces jointes" : "Pièces jointes"}
            </label>
            <AttachmentZone files={newFiles} onChange={setNewFiles} />
          </div>

          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 12, marginBottom: 14 }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} disabled={saving} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 8, cursor: "pointer",
              background: `linear-gradient(135deg, ${dark.accent}cc, ${dark.accent})`,
              border: "none", color: dark.text, fontSize: 13, fontWeight: 700,
              boxShadow: `0 4px 14px ${dark.accent}40`, transition: "all 0.15s",
            }}>
              {saving ? "Enregistrement…" : editTarget ? "Mettre à jour" : "Créer l'expérience"}
            </button>
            <button onClick={() => { setShowForm(false); setEditTarget(null); resetBlocks() }}
              style={{ padding: "9px 16px", borderRadius: 8, background: dark.input, border: `1px solid ${dark.border}`, color: dark.sub, fontSize: 13, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Liste ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: dark.muted }}>
          <FlaskConical size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>Aucune expérience enregistrée.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>Documentez vos protocoles, données et résultats.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(t => {
            const cfg   = t.resultType ? RESULT_CFG[t.resultType] : null
            const Icon  = cfg?.icon ?? FlaskConical
            const isExp = !!expanded[t.id]
            const hasTable   = !!t.structuredData?._table
            const hasDrawing = !!t.structuredData?._drawing
            const hasFiles   = (t.attachments?.length ?? 0) > 0

            return (
              <div key={t.id} style={{
                background: dark.card, borderRadius: 12, overflow: "hidden",
                border: `1px solid ${cfg ? cfg.border : dark.border}`,
                transition: "all 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ""}
              >
                {/* Barre colorée */}
                <div style={{ height: 3, background: cfg ? `linear-gradient(90deg, ${cfg.color}, ${cfg.color}44)` : "linear-gradient(90deg, #8b5cf6, #8b5cf644)" }} />

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
                  onClick={() => setExpanded(p => ({ ...p, [t.id]: !p[t.id] }))}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: cfg ? cfg.bg : "rgba(139,92,246,0.12)",
                    border: `1px solid ${cfg ? cfg.border : "rgba(139,92,246,0.3)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={16} style={{ color: cfg ? cfg.color : "#8b5cf6" }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: dark.text }}>{t.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: dark.hover, color: dark.sub }}>{t.project.code}</span>
                      {cfg ? (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 10, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 9px", borderRadius: 10, background: dark.hover, color: dark.muted }}>En cours</span>
                      )}
                      {/* Indicateurs blocs */}
                      {hasTable   && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 6, background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>Tableau</span>}
                      {hasDrawing && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 6, background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>Dessin</span>}
                      {hasFiles   && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 6, background: "rgba(16,185,129,0.12)", color: "#34d399" }}>{t.attachments.length} fichier{t.attachments.length > 1 ? "s" : ""}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: dark.sub, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.objective}</p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); openEdit(t) }}
                      style={{ padding: "5px 8px", borderRadius: 6, background: dark.input, border: `1px solid ${dark.border}`, cursor: "pointer", color: dark.muted, transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.15)"; e.currentTarget.style.color = "#a78bfa" }}
                      onMouseLeave={e => { e.currentTarget.style.background = dark.input; e.currentTarget.style.color = dark.muted }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(t.id) }}
                      style={{ padding: "5px 8px", borderRadius: 6, background: dark.input, border: `1px solid ${dark.border}`, cursor: "pointer", color: dark.muted, transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#f87171" }}
                      onMouseLeave={e => { e.currentTarget.style.background = dark.input; e.currentTarget.style.color = dark.muted }}>
                      <Trash2 size={13} />
                    </button>
                    {isExp ? <ChevronUp size={15} style={{ color: dark.muted }} /> : <ChevronDown size={15} style={{ color: dark.muted }} />}
                  </div>
                </div>

                {/* Détail expandé */}
                {isExp && (
                  <div style={{ borderTop: `1px solid ${dark.border}`, padding: "16px 16px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {SECTIONS.map(s => {
                        const val = (t as any)[s.key]
                        if (!val && s.key !== "objective") return null
                        return (
                          <div key={s.key}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: dark.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>{s.label}</p>
                            <p style={{ fontSize: 13, color: dark.text2, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{val}</p>
                          </div>
                        )
                      })}

                      {/* Tableau */}
                      {hasTable && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                            <Table2 size={11} /> Tableau de données
                          </p>
                          <TableEditor value={t.structuredData!._table as TableData} onChange={() => {}} readonly />
                        </div>
                      )}

                      {/* Dessin */}
                      {hasDrawing && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                            <PencilIcon size={11} /> Bloc-notes / Dessin
                          </p>
                          <DrawingPad value={t.structuredData!._drawing as string} onChange={() => {}} readonly />
                        </div>
                      )}

                      {/* Pièces jointes */}
                      {hasFiles && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                            <Paperclip size={11} /> Pièces jointes ({t.attachments.length})
                          </p>
                          <AttachmentZone files={[]} onChange={() => {}} readonly savedAttachments={t.attachments} />
                        </div>
                      )}

                      <p style={{ fontSize: 10, color: dark.muted, marginTop: 4 }}>
                        Créé le {new Date(t.createdAt).toLocaleDateString("fr-CA")}
                        {t.updatedAt !== t.createdAt && ` · Mis à jour le ${new Date(t.updatedAt).toLocaleDateString("fr-CA")}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
