"use client"
import { useThemeColors } from "@/hooks/use-theme-colors"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Users, Calendar, Clock, MapPin, Plus, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, ArrowRight, FileText, Trash2,
  Search, X, CalendarDays,
} from "lucide-react"

type OrgMember = { id: string; name: string }
type Project   = { id: string; name: string; code: string }
type Meeting   = {
  id: string; title: string; date: string; duration: number
  location: string | null; agenda: string | null; summary: string | null
  decisions: string | null; problems: string | null; nextSteps: string | null
  project: { id: string; name: string; code: string }
  participants: { user: { id: string; name: string } }[]
}

interface Props {
  meetings: Meeting[]
  projects: Project[]
  orgMembers: OrgMember[]
}

// ── Config ─────────────────────────────────────────────────────────────────────
type DC = ReturnType<typeof useThemeColors>

// ── Field ──────────────────────────────────────────────────────────────────────
function Field({ label, children, dark }: { label: string; children: React.ReactNode; dark: DC }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: dark.sub, display: "block", marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</label>
      {children}
    </div>
  )
}

function FInput({ value, onChange, type = "text", placeholder, dark }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; dark: DC }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", padding: "8px 12px", background: dark.input,
        border: `1px solid ${dark.border}`, borderRadius: 8,
        color: dark.text, fontSize: 13, outline: "none", boxSizing: "border-box",
      }}
    />
  )
}

function FTextarea({ value, onChange, rows = 3, placeholder, dark }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; dark: DC }) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", padding: "8px 12px", background: dark.input,
        border: `1px solid ${dark.border}`, borderRadius: 8,
        color: dark.text, fontSize: 13, outline: "none", resize: "vertical",
        boxSizing: "border-box", lineHeight: 1.5,
      }}
    />
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function ReunionsClient({ meetings: initial, projects, orgMembers }: Props) {
  const dark = useThemeColors()
  const router = useRouter()
  const [meetings, setMeetings] = useState<Meeting[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [filterProject, setFilterProject] = useState("all")
  const [search, setSearch]     = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  const today = new Date().toISOString().split("T")[0]
  const now   = new Date().toTimeString().slice(0, 5)

  const [form, setForm] = useState({
    projectId: "", title: "", date: today, time: now,
    duration: "60", location: "",
    agenda: "", summary: "", decisions: "", problems: "", nextSteps: "",
    participantIds: [] as string[],
  })

  const setF = (field: string) => (v: string) => setForm(p => ({ ...p, [field]: v }))

  const filtered = useMemo(() => {
    let list = meetings
    if (filterProject !== "all") list = list.filter(m => m.project.id === filterProject)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m => m.title.toLowerCase().includes(q) || m.project.code.toLowerCase().includes(q))
    }
    return list
  }, [meetings, filterProject, search])

  const toggleParticipant = (uid: string) => {
    setForm(p => ({
      ...p,
      participantIds: p.participantIds.includes(uid)
        ? p.participantIds.filter(id => id !== uid)
        : [...p.participantIds, uid],
    }))
  }

  async function handleCreate() {
    if (!form.projectId || !form.title || !form.date) {
      setError("Projet, titre et date requis."); return
    }
    setLoading(true); setError("")
    const dateTime = new Date(`${form.date}T${form.time || "09:00"}`)
    const res = await fetch("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form, date: dateTime.toISOString(),
        participantIds: form.participantIds.length > 0 ? form.participantIds : undefined,
      }),
    })
    if (!res.ok) { setError((await res.json()).error ?? "Erreur"); setLoading(false); return }
    const created = await res.json()
    setMeetings(p => [created, ...p])
    setShowForm(false)
    setForm({ projectId: "", title: "", date: today, time: now, duration: "60", location: "", agenda: "", summary: "", decisions: "", problems: "", nextSteps: "", participantIds: [] })
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/reunions/${id}`, { method: "DELETE" })
    setMeetings(p => p.filter(m => m.id !== id))
    router.refresh()
  }

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  // Stats
  const documented = meetings.filter(m => m.decisions || m.problems || m.nextSteps).length
  const upcomingMs = meetings.filter(m => new Date(m.date) > new Date())
  const totalMinutes = meetings.reduce((s, m) => s + m.duration, 0)

  return (
    <div style={{ minHeight: "100vh", background: dark.bg, padding: "32px 40px", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <CalendarDays size={20} color="#22d3ee" />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: dark.text, margin: 0 }}>Réunions</h1>
          </div>
          <p style={{ color: dark.sub, fontSize: 13, margin: 0 }}>
            Preuves contemporaines RS&DE — décisions, problèmes, étapes
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(34,211,238,0.4)" }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 18px",
            background: "linear-gradient(135deg,#0ea5e9,#22d3ee)", border: "none",
            borderRadius: 8, color: "#000", fontWeight: 600, fontSize: 13, cursor: "pointer",
            transition: "all .2s ease",
          }}
        >
          <Plus size={15} /> Nouvelle réunion
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total réunions",     value: meetings.length,       color: "#22d3ee" },
          { label: "Documentées RS&DE",  value: documented,            color: "#4ade80" },
          { label: "À venir",            value: upcomingMs.length,     color: "#818cf8" },
          { label: "Heures de réunion",  value: `${Math.round(totalMinutes / 60)}h`, color: "#fb923c" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: dark.sub }}>{label}</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 300 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: dark.sub }} />
          <input
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", paddingLeft: 32, paddingRight: 12, height: 36,
              background: dark.input, border: `1px solid ${dark.border}`, borderRadius: 8,
              color: dark.text, fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        {projects.length > 1 && (
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            style={{
              padding: "6px 12px", background: dark.input, border: `1px solid ${dark.border}`,
              borderRadius: 8, color: dark.text, fontSize: 13, outline: "none",
            }}
          >
            <option value="all">Tous les projets</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        )}
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: dark.sub }}>
          <CalendarDays size={36} style={{ opacity: .3, margin: "0 auto 14px", display: "block" }} />
          <p style={{ margin: "0 0 6px", fontSize: 15, color: dark.muted }}>Aucune réunion enregistrée</p>
          <p style={{ margin: 0, fontSize: 12 }}>Documentez vos réunions pour générer des preuves contemporaines RS&DE.</p>
        </div>
      )}

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(m => {
          const isExp = !!expanded[m.id]
          const hasStructured = m.decisions || m.problems || m.nextSteps
          const isPast = new Date(m.date) < new Date()

          return (
            <div
              key={m.id}
              style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 12, overflow: "hidden", transition: "border-color .2s" }}
            >
              {/* Header row */}
              <div
                onClick={() => toggle(m.id)}
                onMouseEnter={e => e.currentTarget.style.background = dark.hover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 20px", cursor: "pointer", transition: "background .15s" }}
              >
                {/* Icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: isPast ? "rgba(100,116,139,0.15)" : "rgba(34,211,238,0.12)",
                  border: `1px solid ${isPast ? "rgba(100,116,139,0.2)" : "rgba(34,211,238,0.25)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Users size={16} color={isPast ? dark.sub : "#22d3ee"} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: dark.text }}>{m.title}</span>
                    <span style={{
                      fontFamily: "monospace", fontSize: 10, color: "#22d3ee",
                      background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.25)",
                      borderRadius: 4, padding: "1px 6px",
                    }}>{m.project.code}</span>
                    {hasStructured && (
                      <span style={{ fontSize: 10, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 4, padding: "1px 6px" }}>
                        Documentée
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: dark.sub }}>
                      <Calendar size={11} />
                      {new Date(m.date).toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: dark.sub }}>
                      <Clock size={11} /> {m.duration} min
                    </span>
                    {m.location && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: dark.sub }}>
                        <MapPin size={11} /> {m.location}
                      </span>
                    )}
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: dark.sub }}>
                      <Users size={11} /> {m.participants.length} participant{m.participants.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); if (confirm("Supprimer cette réunion ?")) handleDelete(m.id) }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                    onMouseLeave={e => e.currentTarget.style.color = dark.sub}
                    style={{ background: "none", border: "none", cursor: "pointer", color: dark.sub, padding: 4, transition: "color .15s" }}
                  >
                    <Trash2 size={14} />
                  </button>
                  {isExp ? <ChevronUp size={16} color={dark.sub} /> : <ChevronDown size={16} color={dark.sub} />}
                </div>
              </div>

              {/* Detail */}
              {isExp && (
                <div style={{ borderTop: `1px solid ${dark.border}`, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Participants */}
                  {m.participants.length > 0 && (
                    <div>
                      <p style={{ margin: "0 0 8px", fontSize: 11, color: dark.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Participants</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {m.participants.map(p => (
                          <span key={p.user.id} style={{
                            fontSize: 11, color: dark.sub, background: dark.input,
                            border: `1px solid ${dark.border}`, borderRadius: 20, padding: "3px 10px",
                          }}>
                            {p.user.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agenda + Summary */}
                  {m.agenda && (
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: 11, color: dark.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Ordre du jour</p>
                      <p style={{ margin: 0, fontSize: 13, color: dark.sub, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{m.agenda}</p>
                    </div>
                  )}
                  {m.summary && (
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: 11, color: dark.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", display: "flex", alignItems: "center", gap: 5 }}>
                        <FileText size={11} /> Résumé
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: dark.sub, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{m.summary}</p>
                    </div>
                  )}

                  {/* RS&DE structured block */}
                  {(m.decisions || m.problems || m.nextSteps) && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                      {m.decisions && (
                        <div style={{ padding: "12px 14px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10 }}>
                          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#4ade80", display: "flex", alignItems: "center", gap: 5 }}>
                            <CheckCircle2 size={12} /> Décisions
                          </p>
                          <p style={{ margin: 0, fontSize: 12, color: dark.sub, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.decisions}</p>
                        </div>
                      )}
                      {m.problems && (
                        <div style={{ padding: "12px 14px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10 }}>
                          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#f87171", display: "flex", alignItems: "center", gap: 5 }}>
                            <AlertTriangle size={12} /> Problèmes
                          </p>
                          <p style={{ margin: 0, fontSize: 12, color: dark.sub, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.problems}</p>
                        </div>
                      )}
                      {m.nextSteps && (
                        <div style={{ padding: "12px 14px", background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.2)", borderRadius: 10 }}>
                          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#818cf8", display: "flex", alignItems: "center", gap: 5 }}>
                            <ArrowRight size={12} /> Prochaines étapes
                          </p>
                          <p style={{ margin: 0, fontSize: 12, color: dark.sub, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.nextSteps}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create dialog */}
      {showForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div style={{ background: dark.panel, border: `1px solid ${dark.border}`, borderRadius: 16, padding: 28, width: 640, maxWidth: "100%", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: dark.text }}>Nouvelle réunion</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: dark.sub }}><X size={18} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Projet */}
              <Field label="Projet *" dark={dark}>
                <select
                  value={form.projectId}
                  onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", background: dark.input, border: `1px solid ${dark.border}`, borderRadius: 8, color: dark.text, fontSize: 13, outline: "none" }}
                >
                  <option value="">Sélectionner un projet</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </Field>

              <Field label="Titre *" dark={dark}>
                <FInput value={form.title} onChange={setF("title")} placeholder="Ex: Revue hebdomadaire sprint 3" dark={dark} />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                <Field label="Date *" dark={dark}>
                  <FInput type="date" value={form.date} onChange={setF("date")} dark={dark} />
                </Field>
                <Field label="Heure" dark={dark}>
                  <FInput type="time" value={form.time} onChange={setF("time")} dark={dark} />
                </Field>
                <Field label="Durée (min)" dark={dark}>
                  <FInput type="number" value={form.duration} onChange={setF("duration")} dark={dark} />
                </Field>
                <Field label="Lieu" dark={dark}>
                  <FInput value={form.location} onChange={setF("location")} placeholder="Salle A, Teams…" dark={dark} />
                </Field>
              </div>

              {/* Participants */}
              <Field label="Participants" dark={dark}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                  {orgMembers.map(u => {
                    const sel = form.participantIds.includes(u.id)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleParticipant(u.id)}
                        style={{
                          padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                          border: `1px solid ${sel ? "rgba(34,211,238,0.5)" : dark.border}`,
                          background: sel ? "rgba(34,211,238,0.15)" : "transparent",
                          color: sel ? "#22d3ee" : dark.sub,
                          transition: "all .15s ease",
                        }}
                      >
                        {u.name}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <Field label="Ordre du jour" dark={dark}>
                <FTextarea value={form.agenda} onChange={setF("agenda")} rows={2} placeholder="Sujets à aborder…" dark={dark} />
              </Field>

              <Field label="Résumé" dark={dark}>
                <FTextarea value={form.summary} onChange={setF("summary")} rows={2} placeholder="Résumé général…" dark={dark} />
              </Field>

              {/* RS&DE structured */}
              <div style={{ padding: "16px", background: dark.inputDisabled, border: `1px solid ${dark.border}`, borderRadius: 10 }}>
                <p style={{ margin: "0 0 14px", fontSize: 11, color: "#22d3ee", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Documentation RS&DE — Preuves contemporaines
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Field label="✓ Décisions prises" dark={dark}>
                    <FTextarea value={form.decisions} onChange={setF("decisions")} rows={2} placeholder="Décisions prises durant la réunion…" dark={dark} />
                  </Field>
                  <Field label="⚠ Problèmes / incertitudes" dark={dark}>
                    <FTextarea value={form.problems} onChange={setF("problems")} rows={2} placeholder="Problèmes, blocages, questions sans réponse…" dark={dark} />
                  </Field>
                  <Field label="→ Prochaines étapes" dark={dark}>
                    <FTextarea value={form.nextSteps} onChange={setF("nextSteps")} rows={2} placeholder="Actions, qui fait quoi…" dark={dark} />
                  </Field>
                </div>
              </div>

              {error && <p style={{ margin: 0, color: "#f87171", fontSize: 12 }}>{error}</p>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ padding: "8px 18px", background: "transparent", border: `1px solid ${dark.border}`, borderRadius: 8, color: dark.sub, fontSize: 13, cursor: "pointer" }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(34,211,238,0.4)" } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}
                  style={{
                    padding: "8px 20px", background: "linear-gradient(135deg,#0ea5e9,#22d3ee)",
                    border: "none", borderRadius: 8, color: "#000", fontWeight: 600,
                    fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? .7 : 1, transition: "all .2s ease",
                  }}
                >
                  {loading ? "Enregistrement…" : "Enregistrer la réunion"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
