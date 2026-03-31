"use client"
import { useThemeColors } from "@/hooks/use-theme-colors"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Eye, Lightbulb, AlertTriangle, CheckCircle2, GitBranch,
  FlaskConical, BookOpen, Plus, Lock, Filter, Clock,
  PenLine, Tag, ChevronDown, ChevronUp, ShieldCheck, X,
  Search, FileText, Table2, Pencil, Paperclip,
} from "lucide-react"
import { TableEditor, defaultTable, type TableData } from "@/components/eln/table-editor"
import { DrawingPad } from "@/components/eln/drawing-pad"
import { AttachmentZone, type PendingFile } from "@/components/eln/attachment-zone"

// ── Types ──────────────────────────────────────────────────────────────────────
type Project = { id: string; name: string; code: string }
type Attachment = { id: string; fileName: string; fileUrl: string; mimeType: string | null }
type Entry = {
  id: string; type: string; title: string | null; content: string
  structuredData: Record<string, any> | null; tags: string[]
  signedBy: string | null; signedAt: string | null; createdAt: string
  author: { id: string; name: string }
  project: { id: string; name: string; code: string }
  attachments: Attachment[]
}

// ── Config types ───────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, {
  label: string; icon: React.ElementType; color: string
  bg: string; border: string; description: string
  fields?: { key: string; label: string; placeholder: string; rows?: number }[]
}> = {
  OBSERVATION: {
    label: "Observation", icon: Eye,
    color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)",
    description: "Constatation factuelle en temps réel",
    fields: [
      { key: "conditions",   label: "Conditions d'observation", placeholder: "Température, pression, équipement utilisé…" },
      { key: "observation",  label: "Observation *",            placeholder: "Décrivez précisément ce qui a été observé…", rows: 4 },
      { key: "impact",       label: "Impact potentiel",         placeholder: "Quelle implication pour le projet ?" },
    ],
  },
  DISCOVERY: {
    label: "Découverte", icon: Lightbulb,
    color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)",
    description: "Nouvelle connaissance ou avancée scientifique",
    fields: [
      { key: "discovery",    label: "Découverte *",             placeholder: "Décrivez la nouvelle connaissance acquise…", rows: 3 },
      { key: "source",       label: "Source / contexte",        placeholder: "Comment cette découverte a-t-elle été faite ?" },
      { key: "implications", label: "Implications RS&DE",       placeholder: "En quoi cela avance-t-il les objectifs R&D ?" },
    ],
  },
  PROBLEM: {
    label: "Problème", icon: AlertTriangle,
    color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)",
    description: "Problème ou blocage rencontré",
    fields: [
      { key: "description", label: "Description du problème *", placeholder: "Décrivez le problème rencontré…", rows: 3 },
      { key: "impact",      label: "Impact sur le projet",      placeholder: "Délai, budget, résultats affectés…" },
      { key: "actions",     label: "Actions correctives",       placeholder: "Solutions essayées ou envisagées…" },
    ],
  },
  DECISION: {
    label: "Décision", icon: CheckCircle2,
    color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)",
    description: "Décision formelle prise",
    fields: [
      { key: "context",       label: "Contexte *",              placeholder: "Quelle situation a conduit à cette décision ?" },
      { key: "options",       label: "Options considérées",     placeholder: "Quelles alternatives ont été évaluées ?" },
      { key: "decision",      label: "Décision prise *",        placeholder: "Énoncez clairement la décision…" },
      { key: "justification", label: "Justification",           placeholder: "Pourquoi cette option a-t-elle été retenue ?" },
    ],
  },
  DIRECTION_CHANGE: {
    label: "Changement de direction", icon: GitBranch,
    color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)",
    description: "Pivot ou réorientation du projet",
    fields: [
      { key: "reason",       label: "Raison du pivot *",        placeholder: "Qu'est-ce qui a motivé ce changement ?" },
      { key: "newDirection", label: "Nouvelle direction *",     placeholder: "Décrivez la nouvelle orientation…" },
      { key: "impact",       label: "Impact sur le projet",     placeholder: "Ressources, délais, objectifs affectés…" },
    ],
  },
  TEST_RESULT: {
    label: "Résultat d'expérience", icon: FlaskConical,
    color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.3)",
    description: "Résultat d'une expérience ou d'un test",
    fields: [
      { key: "hypothesis", label: "Hypothèse testée *",         placeholder: "Quelle hypothèse cherchait-on à valider ?" },
      { key: "protocol",   label: "Protocole utilisé",          placeholder: "Méthode, équipement, paramètres…" },
      { key: "variables",  label: "Variables mesurées",         placeholder: "Données collectées, unités…" },
      { key: "results",    label: "Résultats obtenus *",        placeholder: "Valeurs, observations, données brutes…", rows: 3 },
      { key: "conclusion", label: "Conclusion / interprétation", placeholder: "Que peut-on conclure ? Hypothèse validée ?" },
    ],
  },
  GENERAL: {
    label: "Note générale", icon: BookOpen,
    color: "#64748b", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)",
    description: "Note ou observation générale",
  },
}


// ── Composant principal ────────────────────────────────────────────────────────
interface Props { entries: Entry[]; projects: Project[] }

export function JournalClient({ entries: initial, projects }: Props) {
  const dark = useThemeColors()
  const router = useRouter()
  const [entries, setEntries]               = useState<Entry[]>(initial)
  const [showForm, setShowForm]             = useState(false)
  const [filterProject, setFilterProject]   = useState("all")
  const [filterType, setFilterType]         = useState("all")
  const [search, setSearch]                 = useState("")
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState("")
  const [showSign, setShowSign]             = useState(false)
  const [signName, setSignName]             = useState("")
  const [expandedId, setExpandedId]         = useState<string | null>(null)

  // Formulaire
  const [form, setForm] = useState({
    projectId: "", type: "GENERAL", title: "", content: "",
    tags: [] as string[], tagInput: "",
  })
  const [structured, setStructured] = useState<Record<string, string>>({})

  // Blocs optionnels
  const [showTable,   setShowTable]   = useState(false)
  const [tableData,   setTableData]   = useState<TableData>(defaultTable())
  const [showDrawing, setShowDrawing] = useState(false)
  const [drawing,     setDrawing_]    = useState<string | null>(null)
  const [attachments, setAttachments] = useState<PendingFile[]>([])

  const cfg = TYPE_CONFIG[form.type] ?? TYPE_CONFIG.GENERAL

  // Réinitialiser les champs structurés quand le type change
  function changeType(t: string) {
    setForm(p => ({ ...p, type: t, content: "" }))
    setStructured({})
  }

  // Ajouter un tag
  function addTag() {
    const t = form.tagInput.trim().toLowerCase()
    if (t && !form.tags.includes(t)) setForm(p => ({ ...p, tags: [...p.tags, t], tagInput: "" }))
    else setForm(p => ({ ...p, tagInput: "" }))
  }

  // Ouvrir dialog signature
  function requestSign() {
    if (!form.projectId) { setError("Sélectionnez un projet."); return }
    // Contenu = champs structurés concaténés ou contenu libre
    const hasFields = cfg.fields && cfg.fields.length > 0
    const mainContent = hasFields
      ? cfg.fields!.map(f => structured[f.key] ? `**${f.label}**\n${structured[f.key]}` : "").filter(Boolean).join("\n\n")
      : form.content
    if (!mainContent.trim()) { setError("Le contenu ne peut pas être vide."); return }
    setError(""); setShowSign(true)
  }

  // Soumettre avec signature
  async function handleCreate() {
    setSaving(true); setError("")
    const hasFields = cfg.fields && cfg.fields.length > 0
    const mainContent = hasFields
      ? cfg.fields!.map(f => structured[f.key] ? `**${f.label}**\n${structured[f.key]}` : "").filter(Boolean).join("\n\n")
      : form.content

    try {
      // Inclure tableau + dessin dans structuredData si activés
      const extraData: Record<string, any> = hasFields ? { ...structured } : {}
      if (showTable) extraData._table = tableData
      if (showDrawing && drawing) extraData._drawing = drawing

      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId:      form.projectId,
          type:           form.type,
          title:          form.title || null,
          content:        mainContent,
          structuredData: Object.keys(extraData).length > 0 ? extraData : null,
          tags:           form.tags,
          signedBy:       signName.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d?.error ?? `Erreur ${res.status}`); setSaving(false); return
      }
      const created = await res.json()

      // Enregistrer les pièces jointes uploadées
      const uploaded = attachments.filter(a => a.uploaded)
      for (const pf of uploaded) {
        await fetch(`/api/journal/${created.id}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: pf.file.name,
            fileUrl:  pf.uploaded!,
            fileSize: pf.file.size,
            mimeType: pf.file.type,
          }),
        }).catch(() => {})
      }

      setEntries(p => [{ ...created, attachments: [] }, ...p])
      setForm({ projectId: "", type: "GENERAL", title: "", content: "", tags: [], tagInput: "" })
      setStructured({}); setTableData(defaultTable()); setDrawing_(null)
      setAttachments([]); setShowTable(false); setShowDrawing(false)
      setShowForm(false); setShowSign(false); setSignName("")
      router.refresh()
    } catch { setError("Erreur réseau") }
    finally { setSaving(false) }
  }

  // Filtres + recherche
  const filtered = useMemo(() => entries.filter(e =>
    (filterProject === "all" || e.project.id === filterProject) &&
    (filterType === "all" || e.type === filterType) &&
    (!search || e.content.toLowerCase().includes(search.toLowerCase()) ||
     e.title?.toLowerCase().includes(search.toLowerCase()) ||
     e.tags.some(t => t.includes(search.toLowerCase())))
  ), [entries, filterProject, filterType, search])

  const grouped = useMemo(() => {
    const map: Record<string, Entry[]> = {}
    filtered.forEach(e => {
      const day = new Date(e.createdAt).toISOString().split("T")[0]
      if (!map[day]) map[day] = []
      map[day].push(e)
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  // Tous les tags utilisés
  const allTags = useMemo(() => [...new Set(entries.flatMap(e => e.tags))].sort(), [entries])

  return (
    <div style={{ minHeight: "100vh", background: dark.bg, padding: "28px 32px", color: dark.text }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: dark.text, letterSpacing: -0.5 }}>
            Cahier de laboratoire
          </h1>
          <p style={{ fontSize: 13, color: dark.sub, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={13} />
            Entrées immuables — preuves contemporaines conformes ARC / audit RS&DE
          </p>
        </div>
        <button
          onClick={() => { setShowForm(p => !p); setError("") }}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 18px", borderRadius: 8, cursor: "pointer",
            background: showForm ? "rgba(99,102,241,0.15)" : "linear-gradient(135deg, #6366f1, #4f46e5)",
            border: showForm ? "1px solid #6366f1" : "none",
            color: dark.text, fontSize: 13, fontWeight: 700,
            transition: "all 0.15s",
            boxShadow: showForm ? "none" : "0 4px 14px rgba(99,102,241,0.4)",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(99,102,241,0.5)" }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = showForm ? "none" : "0 4px 14px rgba(99,102,241,0.4)" }}
        >
          <Plus size={15} />
          Nouvelle entrée
        </button>
      </div>

      {/* ── Formulaire ── */}
      {showForm && (
        <div style={{
          background: dark.card, borderRadius: 14, padding: 22,
          border: `1px solid ${cfg.border}`,
          marginBottom: 22,
          boxShadow: `0 0 0 1px ${cfg.border}, 0 8px 32px rgba(0,0,0,0.4)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <PenLine size={15} style={{ color: cfg.color }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>Nouvelle entrée ELN</span>
          </div>

          {/* Projet + type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Projet *</label>
              <Select value={form.projectId} onValueChange={v => setForm(p => ({ ...p, projectId: v }))}>
                <SelectTrigger style={{ background: dark.input, border: "1px solid rgba(255,255,255,0.1)", color: dark.text }}>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Type d'entrée</label>
              <Select value={form.type} onValueChange={changeType}>
                <SelectTrigger style={{ background: dark.input, border: "1px solid rgba(255,255,255,0.1)", color: dark.text }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([key, c]) => (
                    <SelectItem key={key} value={key}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <c.icon size={13} />
                        <span>{c.label}</span>
                        <span style={{ fontSize: 10, color: dark.sub, marginLeft: 4 }}>— {c.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Titre */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Titre (optionnel)</label>
            <Input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Titre court décrivant cette entrée…"
              style={{ background: dark.input, border: "1px solid rgba(255,255,255,0.1)", color: dark.text }}
            />
          </div>

          {/* Champs structurés selon le type */}
          {cfg.fields ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
              {cfg.fields.map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 5, letterSpacing: 0.3 }}>
                    {field.label}
                  </label>
                  <Textarea
                    rows={field.rows ?? 2}
                    value={structured[field.key] ?? ""}
                    onChange={e => setStructured(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, resize: "vertical" }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Contenu *</label>
              <Textarea
                rows={5}
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Décrivez précisément vos observations, découvertes, décisions… Soyez factuel."
                style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, resize: "vertical" }}
              />
            </div>
          )}

          {/* ── Blocs optionnels ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button
              onClick={() => setShowTable(p => !p)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 7, cursor: "pointer",
                background: showTable ? "rgba(99,102,241,0.2)" : dark.hover,
                border: showTable ? "1px solid #6366f1" : `1px solid ${dark.border}`,
                color: showTable ? "#818cf8" : dark.muted, fontSize: 12, fontWeight: 600, transition: "all 0.15s",
              }}
            ><Table2 size={13} /> Tableur de données</button>
            <button
              onClick={() => setShowDrawing(p => !p)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 7, cursor: "pointer",
                background: showDrawing ? "rgba(139,92,246,0.2)" : dark.hover,
                border: showDrawing ? "1px solid #8b5cf6" : `1px solid ${dark.border}`,
                color: showDrawing ? "#a78bfa" : dark.muted, fontSize: 12, fontWeight: 600, transition: "all 0.15s",
              }}
            ><Pencil size={13} /> Bloc-notes / Dessin</button>
            <button
              onClick={() => {}}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 7, cursor: "pointer",
                background: attachments.length > 0 ? "rgba(16,185,129,0.15)" : dark.hover,
                border: attachments.length > 0 ? "1px solid #10b981" : `1px solid ${dark.border}`,
                color: attachments.length > 0 ? "#34d399" : dark.muted, fontSize: 12, fontWeight: 600,
              }}
            ><Paperclip size={13} /> Pièces jointes {attachments.length > 0 && `(${attachments.length})`}</button>
          </div>

          {/* Tableau de données */}
          {showTable && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Tableau de données</label>
              <TableEditor value={tableData} onChange={setTableData} />
            </div>
          )}

          {/* Bloc-notes / Dessin */}
          {showDrawing && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Bloc-notes / Dessin</label>
              <DrawingPad value={drawing} onChange={setDrawing_} />
            </div>
          )}

          {/* Pièces jointes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "#34d399", fontWeight: 700, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Pièces jointes</label>
            <AttachmentZone files={attachments} onChange={setAttachments} />
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Tags</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {form.tags.map(t => (
                <span key={t} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "2px 9px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}44`,
                }}>
                  #{t}
                  <button onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1 }}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              <div style={{ display: "flex", gap: 6 }}>
                <Input
                  value={form.tagInput}
                  onChange={e => setForm(p => ({ ...p, tagInput: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag() } }}
                  placeholder="Ajouter un tag…"
                  style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, width: 140, height: 28, fontSize: 12 }}
                />
                <button onClick={addTag} style={{ background: dark.hover, border: `1px solid ${dark.border}`, borderRadius: 6, padding: "0 10px", color: dark.sub, fontSize: 11, cursor: "pointer" }}>
                  <Tag size={11} />
                </button>
              </div>
              {allTags.filter(t => !form.tags.includes(t)).slice(0, 5).map(t => (
                <button key={t} onClick={() => setForm(p => ({ ...p, tags: [...p.tags, t] }))}
                  style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, background: dark.card, border: `1px solid ${dark.border}`, color: dark.muted, cursor: "pointer" }}>
                  +{t}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={requestSign}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 18px", borderRadius: 8, cursor: "pointer",
                background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`,
                border: "none", color: dark.text, fontSize: 13, fontWeight: 700,
                boxShadow: `0 4px 14px ${cfg.color}40`,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 18px ${cfg.color}55` }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 14px ${cfg.color}40` }}
            >
              <ShieldCheck size={14} />
              Signer et enregistrer
            </button>
            <button onClick={() => { setShowForm(false); setError(""); setStructured({}) }}
              style={{ padding: "9px 16px", borderRadius: 8, background: dark.input, border: "1px solid rgba(255,255,255,0.1)", color: dark.sub, fontSize: 13, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Dialog signature ── */}
      {showSign && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: dark.panel,
            border: `1px solid ${dark.border}`, borderRadius: 14,
            padding: 28, width: 420,
            boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <ShieldCheck size={18} style={{ color: "#10b981" }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: dark.text }}>Signature électronique</h3>
            </div>
            <p style={{ fontSize: 12, color: dark.sub, marginBottom: 20, lineHeight: 1.6 }}>
              En signant cette entrée, vous certifiez que les informations sont exactes, complètes et ont été consignées en temps réel. L'entrée sera <strong style={{ color: dark.text }}>immuable</strong> après signature.
            </p>
            <label style={{ fontSize: 11, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Votre nom complet *
            </label>
            <Input
              value={signName}
              onChange={e => setSignName(e.target.value)}
              placeholder="Prénom Nom"
              style={{ background: dark.hover, border: `1px solid ${dark.border}`, color: dark.text, marginBottom: 16 }}
              autoFocus
            />
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 20,
              background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
            }}>
              <p style={{ fontSize: 11, color: "#6ee7b7", lineHeight: 1.6 }}>
                ✓ Je certifie que cette entrée est exacte et a été rédigée au moment des faits.<br />
                ✓ Je comprends que cette entrée ne pourra pas être modifiée ou supprimée.
              </p>
            </div>
            {error && (
              <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 12, marginBottom: 14 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleCreate}
                disabled={!signName.trim() || saving}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, cursor: signName.trim() ? "pointer" : "not-allowed",
                  background: signName.trim() ? "linear-gradient(135deg, #10b981, #059669)" : dark.hover,
                  border: "none", color: dark.text, fontSize: 13, fontWeight: 700,
                  boxShadow: signName.trim() ? "0 4px 14px rgba(16,185,129,0.35)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {saving ? "Enregistrement…" : "✓ Signer et enregistrer"}
              </button>
              <button onClick={() => { setShowSign(false); setError("") }}
                style={{ padding: "10px 16px", borderRadius: 8, background: dark.input, border: `1px solid ${dark.border}`, color: dark.sub, fontSize: 13, cursor: "pointer" }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Barre filtres + recherche ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        background: dark.card, borderRadius: 10, padding: "10px 14px",
        border: `1px solid ${dark.border}`, marginBottom: 22,
      }}>
        <Filter size={14} style={{ color: dark.muted, flexShrink: 0 }} />

        {/* Recherche */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 160 }}>
          <Search size={13} style={{ color: dark.muted }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            style={{ background: "none", border: "none", outline: "none", color: dark.text, fontSize: 13, width: "100%" }}
          />
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

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.sub, width: 160, height: 32, fontSize: 12 }}>
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([key, c]) => (
              <SelectItem key={key} value={key}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span style={{ fontSize: 12, color: dark.muted, marginLeft: "auto", fontWeight: 600 }}>
          {filtered.length} entrée{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Timeline ── */}
      {grouped.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: dark.muted }}>
          <FileText size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>Aucune entrée dans le cahier de laboratoire.</p>
          <p style={{ fontSize: 12, marginTop: 6, color: dark.muted }}>Documentez vos observations, découvertes et décisions en temps réel.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {grouped.map(([day, dayEntries]) => (
            <div key={day}>
              {/* Séparateur jour */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 1, background: dark.border }} />
                <span style={{
                  fontSize: 11, fontWeight: 700, color: dark.sub, padding: "3px 12px",
                  borderRadius: 10, background: dark.card, border: `1px solid ${dark.border}`,
                  letterSpacing: 0.5, textTransform: "uppercase",
                }}>
                  {new Date(day + "T12:00:00").toLocaleDateString("fr-CA", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric"
                  })}
                </span>
                <div style={{ flex: 1, height: 1, background: dark.border }} />
              </div>

              {/* Entrées */}
              <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10, paddingLeft: 28 }}>
                <div style={{ position: "absolute", left: 10, top: 8, bottom: 8, width: 2, background: dark.border, borderRadius: 1 }} />

                {dayEntries.map(entry => {
                  const c = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.GENERAL
                  const Icon = c.icon
                  const time = new Date(entry.createdAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })
                  const isExpanded = expandedId === entry.id
                  const hasStructured = entry.structuredData && Object.keys(entry.structuredData).length > 0
                  const entryFields = TYPE_CONFIG[entry.type]?.fields

                  return (
                    <div key={entry.id} style={{ position: "relative" }}>
                      {/* Point timeline */}
                      <div style={{
                        position: "absolute", left: -22, top: 16,
                        width: 12, height: 12, borderRadius: "50%",
                        background: c.color, border: "2px solid #0f172a",
                        boxShadow: `0 0 8px ${c.color}60`,
                      }} />

                      <div style={{
                        background: dark.card, borderRadius: 12,
                        border: `1px solid ${dark.border}`,
                        transition: "all 0.15s",
                        overflow: "hidden",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = `${c.color}44`; e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.3)` }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = dark.border; e.currentTarget.style.boxShadow = "" }}
                      >
                        {/* Barre colorée en haut */}
                        <div style={{ height: 3, background: `linear-gradient(90deg, ${c.color}, ${c.color}55)` }} />

                        <div style={{ padding: "14px 16px" }}>
                          {/* Ligne header */}
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                            {/* Icône type */}
                            <div style={{
                              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                              background: c.bg, border: `1px solid ${c.border}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <Icon size={16} style={{ color: c.color }} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              {/* Badges + heure */}
                              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 5 }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 10,
                                  background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                                }}>
                                  {c.label}
                                </span>
                                <span style={{
                                  fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 8,
                                  background: dark.hover, color: dark.sub,
                                  border: `1px solid ${dark.border}`,
                                }}>
                                  {entry.project.code}
                                </span>
                                {entry.tags.map(t => (
                                  <span key={t} style={{ fontSize: 9, fontWeight: 600, padding: "1px 7px", borderRadius: 8, background: `${c.color}15`, color: c.color }}>
                                    #{t}
                                  </span>
                                ))}
                                <span style={{ fontSize: 11, color: dark.muted, marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                                  <Clock size={11} />
                                  {time} · {entry.author.name}
                                </span>
                              </div>

                              {/* Titre */}
                              {entry.title && (
                                <p style={{ fontSize: 14, fontWeight: 700, color: dark.text, marginBottom: 6 }}>{entry.title}</p>
                              )}

                              {/* Contenu structuré ou libre */}
                              {hasStructured && entryFields ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {entryFields.slice(0, isExpanded ? undefined : 2).map(f => {
                                    const val = (entry.structuredData as Record<string, string>)[f.key]
                                    if (!val) return null
                                    return (
                                      <div key={f.key}>
                                        <p style={{ fontSize: 10, fontWeight: 700, color: dark.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{f.label}</p>
                                        <p style={{ fontSize: 13, color: dark.text2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{val}</p>
                                      </div>
                                    )
                                  })}
                                  {entryFields.length > 2 && (
                                    <button onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                      style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: c.color, fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 600 }}>
                                      {isExpanded ? <><ChevronUp size={13} /> Réduire</> : <><ChevronDown size={13} /> Voir tous les champs ({entryFields.length})</>}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <p style={{ fontSize: 13, color: dark.text2, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{entry.content}</p>
                              )}
                            </div>
                          </div>

                          {/* Tableau de données */}
                          {entry.structuredData?._table && (
                            <div style={{ marginTop: 12 }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                                <Table2 size={11} /> Tableau de données
                              </p>
                              <TableEditor value={entry.structuredData._table as TableData} onChange={() => {}} readonly />
                            </div>
                          )}

                          {/* Dessin */}
                          {entry.structuredData?._drawing && (
                            <div style={{ marginTop: 12 }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                                <Pencil size={11} /> Bloc-notes
                              </p>
                              <DrawingPad value={entry.structuredData._drawing as string} onChange={() => {}} readonly />
                            </div>
                          )}

                          {/* Pièces jointes */}
                          {entry.attachments?.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                                <Paperclip size={11} /> Pièces jointes ({entry.attachments.length})
                              </p>
                              <AttachmentZone files={[]} onChange={() => {}} readonly savedAttachments={entry.attachments} />
                            </div>
                          )}

                          {/* Footer signature */}
                          <div style={{
                            display: "flex", alignItems: "center", gap: 10, marginTop: 12, paddingTop: 10,
                            borderTop: `1px solid ${dark.border}`,
                          }}>
                            {entry.signedBy ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1 }}>
                                <ShieldCheck size={11} style={{ color: "#10b981" }} />
                                <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>
                                  Signé par {entry.signedBy}
                                  {entry.signedAt && ` · ${new Date(entry.signedAt).toLocaleString("fr-CA", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}`}
                                </span>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1 }}>
                                <Lock size={10} style={{ color: dark.muted }} />
                                <span style={{ fontSize: 10, color: dark.muted }}>Entrée immuable · non signée</span>
                              </div>
                            )}
                            <span style={{ fontSize: 9, color: dark.muted, fontFamily: "monospace" }}>
                              #{entry.id.slice(-8)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
