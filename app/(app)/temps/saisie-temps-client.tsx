"use client"
import { useThemeColors } from "@/hooks/use-theme-colors"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Clock, Plus, Trash2, TrendingUp, Calendar, ChevronLeft, ChevronRight,
  Filter, CheckCircle, Zap, BarChart3, Target, User,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────
type Project = { id: string; name: string; code: string; tasks: { id: string; title: string }[] }
type Entry = {
  id: string; date: string; hours: number; description: string; category: string; validated: boolean
  user: { id: string; name: string }
  project: { id: string; name: string; code: string }
  task?: { id: string; title: string } | null
}

interface Props {
  projects: Project[]; entries: Entry[]
  currentUserId: string; currentUserRole: string
  totalHeures: number; rdHeures: number
}

// ── Config ─────────────────────────────────────────────────────────────────────
type DC = ReturnType<typeof useThemeColors>

function getCats(dark: DC) {
  return {
    RD_DIRECT:    { label: "R&D directe",    color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)"  },
    RD_SUPPORT:   { label: "Support R&D",    color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)"  },
    NON_ELIGIBLE: { label: "Non admissible", color: dark.sub,  bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.3)" },
  }
}

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]


// Lundi de la semaine d'une date
function mondayOf(d: Date) {
  const m = new Date(d)
  const day = m.getDay() === 0 ? 6 : m.getDay() - 1
  m.setDate(m.getDate() - day)
  m.setHours(0, 0, 0, 0)
  return m
}

// ── Composant heatmap ─────────────────────────────────────────────────────────
function Heatmap({ entries }: { entries: Entry[] }) {
  const dark = useThemeColors()
  const WEEKS = 15
  const today = new Date(); today.setHours(0,0,0,0)
  const startMon = mondayOf(new Date(today.getTime() - (WEEKS - 1) * 7 * 86400000))

  // Agréger heures par jour
  const dayMap: Record<string, number> = {}
  entries.forEach(e => {
    const d = new Date(e.date).toISOString().slice(0, 10)
    dayMap[d] = (dayMap[d] ?? 0) + e.hours
  })

  const maxH = Math.max(...Object.values(dayMap), 1)

  const weeks: Date[][] = []
  for (let w = 0; w < WEEKS; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(startMon)
      day.setDate(startMon.getDate() + w * 7 + d)
      week.push(day)
    }
    weeks.push(week)
  }

  function intensity(h: number) {
    if (h === 0) return dark.card
    const r = h / maxH
    if (r < 0.25) return "rgba(16,185,129,0.2)"
    if (r < 0.5)  return "rgba(16,185,129,0.45)"
    if (r < 0.75) return "rgba(16,185,129,0.7)"
    return "#10b981"
  }

  return (
    <div>
      <p style={{ fontSize: 11, color: dark.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        Activité — {WEEKS} dernières semaines
      </p>
      <div style={{ display: "flex", gap: 4 }}>
        {/* Labels jours */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, justifyContent: "space-around", paddingTop: 2 }}>
          {["L","M","M","J","V","S","D"].map((d, i) => (
            <span key={i} style={{ fontSize: 9, color: dark.sub, width: 10, textAlign: "center" }}>{d}</span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {week.map((day, di) => {
              const key = day.toISOString().slice(0, 10)
              const h = dayMap[key] ?? 0
              const isToday = key === today.toISOString().slice(0, 10)
              const isFuture = day > today
              return (
                <div key={di} title={`${key} : ${h}h`} style={{
                  width: 12, height: 12, borderRadius: 3,
                  background: isFuture ? dark.hover : intensity(h),
                  border: isToday ? "1px solid #10b981" : "none",
                  transition: "transform 0.1s",
                  cursor: h > 0 ? "pointer" : "default",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.4)" }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "" }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Calendrier hebdomadaire ────────────────────────────────────────────────────
function WeekCalendar({ entries, weekOffset, onDayClick }: {
  entries: Entry[]; weekOffset: number; onDayClick: (date: string) => void
}) {
  const dark = useThemeColors()
  const CATS = getCats(dark)
  const today = new Date(); today.setHours(0,0,0,0)
  const mon = mondayOf(today)
  mon.setDate(mon.getDate() + weekOffset * 7)

  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d
  })

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const dayTotal = (d: Date) => entries.filter(e => new Date(e.date).toISOString().slice(0,10) === fmt(d))
  const dayRD    = (d: Date) => dayTotal(d).filter(e => e.category === "RD_DIRECT").reduce((s,e) => s+e.hours, 0)
  const dayH     = (d: Date) => dayTotal(d).reduce((s,e) => s+e.hours, 0)

  const weekLabel = `${mon.toLocaleDateString("fr-CA", { day: "numeric", month: "short" })} — ${days[6].toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}`

  return (
    <div>
      <p style={{ fontSize: 11, color: dark.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        Semaine du {weekLabel}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {days.map((day, i) => {
          const h     = dayH(day)
          const rd    = dayRD(day)
          const isToday   = fmt(day) === fmt(today)
          const isFuture  = day > today
          const dayEntries = dayTotal(day)

          return (
            <div key={i}
              onClick={() => !isFuture && onDayClick(fmt(day))}
              style={{
                borderRadius: 10, padding: "8px 6px", textAlign: "center",
                border: isToday ? "1px solid rgba(16,185,129,0.5)" : `1px solid ${dark.border}`,
                background: isToday ? "rgba(16,185,129,0.08)" : h > 0 ? dark.card : dark.hover,
                cursor: isFuture ? "default" : "pointer",
                transition: "all 0.15s",
                opacity: isFuture ? 0.35 : 1,
              }}
              onMouseEnter={e => { if (!isFuture) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.background = dark.hover } }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = isToday ? "rgba(16,185,129,0.08)" : h > 0 ? dark.card : dark.hover }}
            >
              <p style={{ fontSize: 9, color: dark.sub, fontWeight: 600, marginBottom: 2 }}>{DAYS_FR[i]}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: isToday ? "#10b981" : dark.text, marginBottom: 4 }}>
                {day.getDate()}
              </p>
              {h > 0 ? (
                <>
                  <p style={{ fontSize: 11, fontWeight: 700, color: dark.text }}>{h}h</p>
                  {rd > 0 && <p style={{ fontSize: 9, color: "#10b981" }}>{rd}h R&D</p>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                    {dayEntries.slice(0, 2).map(e => (
                      <div key={e.id} title={e.description} style={{
                        height: 3, borderRadius: 2,
                        background: CATS[e.category as keyof typeof CATS]?.color ?? "#64748b",
                      }} />
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 9, color: dark.muted }}>—</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────
export function SaisieTempsClient({ projects, entries: initialEntries, currentUserId, currentUserRole, totalHeures, rdHeures }: Props) {
  const dark = useThemeColors()
  const CATS = getCats(dark)
  const router = useRouter()
  const today  = new Date().toISOString().split("T")[0]

  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [weekOffset, setWeekOffset] = useState(0)
  const [form, setForm] = useState({
    projectId: "", taskId: "none", date: today,
    hours: "", description: "", category: "RD_DIRECT",
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState("")
  const [filterProject, setFP] = useState("all")
  const [filterCat, setFC]     = useState("all")
  const [filterUser, setFU]    = useState(currentUserRole === "ADMIN" ? "all" : currentUserId)
  const [tab, setTab]          = useState<"saisie" | "historique">("saisie")

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const selectedProject = projects.find(p => p.id === form.projectId)

  // Stats globales
  const myEntries  = useMemo(() => entries.filter(e => e.user.id === currentUserId), [entries, currentUserId])
  const myTotal    = myEntries.reduce((s, e) => s + e.hours, 0)
  const myRD       = myEntries.filter(e => e.category === "RD_DIRECT").reduce((s, e) => s + e.hours, 0)
  const myRatio    = myTotal > 0 ? Math.round(myRD / myTotal * 100) : 0

  // Cette semaine
  const mon = mondayOf(new Date()); mon.setHours(0,0,0,0)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999)
  const weekEntries = myEntries.filter(e => {
    const d = new Date(e.date)
    return d >= mon && d <= sun
  })
  const weekH = weekEntries.reduce((s, e) => s + e.hours, 0)

  // Par projet
  const projectStats = useMemo(() => {
    return projects.map(p => {
      const pEntries = myEntries.filter(e => e.project.id === p.id)
      const total    = pEntries.reduce((s, e) => s + e.hours, 0)
      const rd       = pEntries.filter(e => e.category === "RD_DIRECT").reduce((s, e) => s + e.hours, 0)
      return { ...p, total, rd, ratio: total > 0 ? Math.round(rd / total * 100) : 0 }
    }).filter(p => p.total > 0).sort((a, b) => b.total - a.total)
  }, [myEntries, projects])

  // Historique filtré groupé par semaine
  const filtered = useMemo(() => entries.filter(e => {
    if (filterProject !== "all" && e.project.id !== filterProject) return false
    if (filterCat !== "all" && e.category !== filterCat) return false
    if (filterUser !== "all" && e.user.id !== filterUser) return false
    return true
  }), [entries, filterProject, filterCat, filterUser])

  const grouped = useMemo(() => {
    const map: Record<string, Entry[]> = {}
    filtered.forEach(e => {
      const d = new Date(e.date)
      const m = mondayOf(d)
      const key = m.toISOString().slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const allUsers = useMemo(() => {
    const map: Record<string, string> = {}
    entries.forEach(e => { map[e.user.id] = e.user.name })
    return Object.entries(map).map(([id, name]) => ({ id, name }))
  }, [entries])

  async function handleSubmit() {
    if (!form.projectId || !form.hours || !form.description) {
      setError("Projet, heures et description requis."); return
    }
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/temps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, taskId: form.taskId === "none" ? null : form.taskId }),
      })
      if (res.ok) {
        const created = await res.json()
        setEntries(prev => [created, ...prev])
        setForm(f => ({ ...f, hours: "", description: "" }))
        router.refresh()
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d?.error ?? `Erreur ${res.status}`)
      }
    } catch { setError("Erreur réseau") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/temps?id=${id}`, { method: "DELETE" })
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div style={{ minHeight: "100vh", background: dark.bg, paddingBottom: 60 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: dark.panel, borderBottom: "1px solid rgba(16,185,129,0.18)", padding: "28px 32px 24px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "2px solid rgba(16,185,129,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 18px rgba(16,185,129,0.2)" }}>
              <Clock size={20} color="#10b981" />
            </div>
            <div>
              <h1 style={{ color: dark.text, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>Saisie de temps</h1>
              <p style={{ fontSize: 13, color: dark.sub, margin: 0, marginTop: 2 }}>RS&DE · Qualifiez chaque heure pour maximiser vos crédits</p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { icon: <Clock size={13}/>,      label: "Mes heures totales",  value: `${myTotal.toFixed(1)}h`,  color: "#10b981" },
              { icon: <Zap size={13}/>,         label: "R&D directe",         value: `${myRD.toFixed(1)}h`,    color: "#3b82f6" },
              { icon: <TrendingUp size={13}/>,  label: "Taux RS&DE",          value: `${myRatio}%`,            color: myRatio >= 60 ? "#10b981" : myRatio >= 30 ? "#f59e0b" : "#ef4444" },
              { icon: <Calendar size={13}/>,    label: "Cette semaine",        value: `${weekH.toFixed(1)}h`,   color: "#8b5cf6" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: dark.card, border: `1px solid ${dark.border}` }}>
                <span style={{ color: s.color }}>{s.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: dark.text }}>{s.value}</span>
                <span style={{ fontSize: 11, color: dark.sub }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contenu ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>

        {/* ── Colonne gauche ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Calendrier hebdomadaire */}
          <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={15} color="#10b981" />
                <span style={{ fontSize: 13, fontWeight: 700, color: dark.text }}>Calendrier</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setWeekOffset(w => w - 1)} style={{ width: 28, height: 28, borderRadius: 7, background: dark.hover, border: `1px solid ${dark.border}`, color: dark.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = dark.hover}
                  onMouseLeave={e => e.currentTarget.style.background = dark.hover}>
                  <ChevronLeft size={13} />
                </button>
                <button onClick={() => setWeekOffset(0)} style={{ padding: "3px 10px", borderRadius: 7, background: weekOffset === 0 ? "rgba(16,185,129,0.15)" : dark.hover, border: `1px solid ${weekOffset === 0 ? "rgba(16,185,129,0.3)" : dark.border}`, color: weekOffset === 0 ? "#10b981" : dark.text, cursor: "pointer", fontSize: 10, fontWeight: 600, transition: "all 0.15s" }}>
                  Auj.
                </button>
                <button onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0} style={{ width: 28, height: 28, borderRadius: 7, background: dark.hover, border: `1px solid ${dark.border}`, color: weekOffset >= 0 ? dark.muted : dark.text, cursor: weekOffset >= 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
            <WeekCalendar entries={myEntries} weekOffset={weekOffset} onDayClick={d => { set("date", d); setTab("saisie") }} />
          </div>

          {/* Heatmap */}
          <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 14, padding: "18px 20px" }}>
            <Heatmap entries={myEntries} />
          </div>

          {/* Par projet */}
          {projectStats.length > 0 && (
            <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <BarChart3 size={15} color="#3b82f6" />
                <span style={{ fontSize: 13, fontWeight: 700, color: dark.text }}>Heures par projet</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {projectStats.map(p => (
                  <div key={p.id}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8" }}>{p.code}</span>
                        <span style={{ fontSize: 12, color: dark.sub }}>{p.name}</span>
                      </div>
                      <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                        <span style={{ color: "#10b981", fontWeight: 700 }}>{p.rd.toFixed(1)}h RS&DE</span>
                        <span style={{ color: dark.sub }}>{p.total.toFixed(1)}h total</span>
                        <span style={{ color: p.ratio >= 60 ? "#10b981" : p.ratio >= 30 ? "#f59e0b" : "#ef4444", fontWeight: 700 }}>{p.ratio}%</span>
                      </div>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: dark.hover, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${p.ratio}%`, borderRadius: 3, background: p.ratio >= 60 ? "linear-gradient(90deg, #10b981, #059669)" : p.ratio >= 30 ? "linear-gradient(90deg, #f59e0b, #d97706)" : "#ef4444", transition: "width 0.6s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historique */}
          <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Filter size={13} color={dark.sub} />
                <span style={{ fontSize: 13, fontWeight: 700, color: dark.text }}>Historique</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select value={filterProject} onChange={e => setFP(e.target.value)} style={{ background: dark.input, border: `1px solid ${dark.border}`, borderRadius: 7, color: dark.text, fontSize: 11, padding: "4px 8px", cursor: "pointer", outline: "none" }}>
                  <option value="all">Tous les projets</option>
                  {projects.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                </select>
                <select value={filterCat} onChange={e => setFC(e.target.value)} style={{ background: dark.input, border: `1px solid ${dark.border}`, borderRadius: 7, color: dark.text, fontSize: 11, padding: "4px 8px", cursor: "pointer", outline: "none" }}>
                  <option value="all">Toutes catégories</option>
                  {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                {currentUserRole === "ADMIN" && (
                  <select value={filterUser} onChange={e => setFU(e.target.value)} style={{ background: dark.input, border: `1px solid ${dark.border}`, borderRadius: 7, color: dark.text, fontSize: 11, padding: "4px 8px", cursor: "pointer", outline: "none" }}>
                    <option value="all">Tous les membres</option>
                    {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                )}
              </div>
            </div>

            {grouped.length === 0 ? (
              <p style={{ textAlign: "center", color: dark.sub, fontSize: 13, padding: "20px 0" }}>Aucune entrée.</p>
            ) : grouped.map(([weekStart, wEntries]) => {
              const wMon = new Date(weekStart)
              const wSun = new Date(wMon); wSun.setDate(wMon.getDate() + 6)
              const wTotal = wEntries.reduce((s, e) => s + e.hours, 0)
              const wRD    = wEntries.filter(e => e.category === "RD_DIRECT").reduce((s, e) => s + e.hours, 0)

              return (
                <div key={weekStart} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, padding: "6px 10px", borderRadius: 7, background: dark.card }}>
                    <span style={{ fontSize: 11, color: dark.sub, fontWeight: 600 }}>
                      Sem. du {wMon.toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
                    </span>
                    <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                      <span style={{ color: "#10b981", fontWeight: 700 }}>{wRD.toFixed(1)}h RS&DE</span>
                      <span style={{ color: dark.sub }}>{wTotal.toFixed(1)}h total</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {wEntries.map(e => {
                      const cat = CATS[e.category as keyof typeof CATS] ?? CATS.NON_ELIGIBLE
                      return (
                        <div key={e.id} style={{
                          display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 12px",
                          borderRadius: 8, border: `1px solid ${cat.border}`, background: cat.bg,
                          transition: "all 0.15s",
                        }}
                          onMouseEnter={e2 => e2.currentTarget.style.transform = "translateX(3px)"}
                          onMouseLeave={e2 => e2.currentTarget.style.transform = ""}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: dark.text }}>{e.project.code}</span>
                              {e.task && <span style={{ fontSize: 10, color: dark.sub }}>· {e.task.title}</span>}
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 8, background: cat.bg, border: `1px solid ${cat.border}`, color: cat.color }}>{cat.label}</span>
                              {currentUserRole === "ADMIN" && <span style={{ fontSize: 10, color: dark.sub, display: "flex", alignItems: "center", gap: 3 }}><User size={9}/> {e.user.name}</span>}
                            </div>
                            <p style={{ fontSize: 11, color: dark.sub, margin: 0, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{e.description}</p>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right" }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: dark.text, margin: 0 }}>{e.hours}h</p>
                            <p style={{ fontSize: 9, color: dark.sub, margin: 0 }}>{new Date(e.date).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}</p>
                          </div>
                          <button onClick={() => handleDelete(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: dark.sub, padding: "2px", borderRadius: 4, display: "flex", alignItems: "center", transition: "color 0.15s" }}
                            onMouseEnter={ev => ev.currentTarget.style.color = "#ef4444"}
                            onMouseLeave={ev => ev.currentTarget.style.color = dark.sub}
                            title="Supprimer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Panneau saisie rapide (droite) ─────────────────────────────── */}
        <div style={{ position: "sticky", top: 24 }}>
          <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, padding: "20px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Plus size={13} color="#10b981" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: dark.text }}>Saisie rapide</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Projet */}
              <div>
                <label style={{ fontSize: 10, color: "#10b981", fontWeight: 700, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Projet *</label>
                <Select value={form.projectId} onValueChange={v => set("projectId", v)}>
                  <SelectTrigger style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12 }}>
                    <SelectValue placeholder="Sélectionner…" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Tâche */}
              {selectedProject && selectedProject.tasks.length > 0 && (
                <div>
                  <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Tâche</label>
                  <Select value={form.taskId} onValueChange={v => set("taskId", v)}>
                    <SelectTrigger style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12 }}>
                      <SelectValue placeholder="Aucune tâche" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune tâche</SelectItem>
                      {selectedProject.tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date + Heures */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Date</label>
                  <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 7, background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Heures *</label>
                  <input type="number" step="0.25" min="0.25" max="24" value={form.hours} onChange={e => set("hours", e.target.value)}
                    placeholder="ex: 3.5"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 7, background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12, outline: "none" }} />
                </div>
              </div>

              {/* Catégorie */}
              <div>
                <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Catégorie RS&DE</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {Object.entries(CATS).map(([k, v]) => (
                    <button key={k} onClick={() => set("category", k)} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                      background: form.category === k ? v.bg : dark.hover,
                      border: `1px solid ${form.category === k ? v.border : dark.border}`,
                      color: form.category === k ? v.color : dark.sub,
                      fontSize: 11, fontWeight: 600, transition: "all 0.15s", textAlign: "left",
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: v.color, flexShrink: 0 }} />
                      {v.label}
                      {form.category === k && <CheckCircle size={11} style={{ marginLeft: "auto" }} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 10, color: dark.sub, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Description des travaux *</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3}
                  placeholder="Décrivez précisément les travaux — important pour RS&DE…"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 7, background: dark.input, border: `1px solid ${dark.border}`, color: dark.text, fontSize: 12, lineHeight: 1.5, resize: "vertical", outline: "none", fontFamily: "inherit" }} />
                <p style={{ fontSize: 10, color: dark.sub, marginTop: 4, lineHeight: 1.4 }}>Soyez précis et technique — utilisé pour la documentation RS&DE.</p>
              </div>

              {error && (
                <div style={{ padding: "7px 10px", borderRadius: 7, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 11 }}>{error}</div>
              )}

              <button onClick={handleSubmit} disabled={saving || !form.projectId || !form.hours || !form.description}
                style={{
                  width: "100%", padding: "10px", borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer",
                  background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "white",
                  boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
                  opacity: saving || !form.projectId || !form.hours || !form.description ? 0.6 : 1,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(16,185,129,0.45)" } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 14px rgba(16,185,129,0.35)" }}
              >
                {saving ? "Enregistrement…" : "Enregistrer les heures"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
