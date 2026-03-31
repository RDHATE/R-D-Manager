"use client"
import { useThemeColors } from "@/hooks/use-theme-colors"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Users, Search, UserPlus, Clock, CheckSquare,
  FolderKanban, ChevronRight, Shield, Star,
  Eye, UserCog, DollarSign, Zap, X, Check,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────
type Member = {
  id: string; name: string; email: string; role: string
  hourlyRate: number | null; weeklyCapacity: number | null; createdAt: string
  _count: { timeEntries: number; assignedTasks: number; projectMembers: number }
  weekHours: number; projectCount: number
}

interface Props {
  members: Member[]
  currentUserId: string
  isAdmin: boolean
}

// ── Config ─────────────────────────────────────────────────────────────────────
type DC = ReturnType<typeof useThemeColors>

function getRoleCfg(dark: DC): Record<string, { label: string; color: string; icon: React.ReactNode }> {
  return {
    ADMIN:           { label: "Administrateur",  color: "#f472b6", icon: <Shield size={11} /> },
    PROJECT_MANAGER: { label: "Chef de projet",  color: "#22d3ee", icon: <Star size={11} />   },
    MEMBER:          { label: "Membre",          color: "#818cf8", icon: <Users size={11} />  },
    VIEWER:          { label: "Observateur",     color: dark.sub,  icon: <Eye size={11} />    },
  }
}

// ── Add member dialog ──────────────────────────────────────────────────────────
function AddMemberDialog({ onCreated }: { onCreated: (m: Member) => void }) {
  const dark = useThemeColors()
  const router = useRouter()
  const [open, setOpen]   = useState(false)
  const [loading, setL]   = useState(false)
  const [error, setError] = useState("")
  const [form, setForm]   = useState({ name: "", email: "", password: "", role: "MEMBER", hourlyRate: "" })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form.name || !form.email || !form.password) { setError("Nom, email et mot de passe requis."); return }
    setL(true); setError("")
    const res = await fetch("/api/equipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : null }),
    })
    if (!res.ok) { setError((await res.json()).error ?? "Erreur"); setL(false); return }
    const created = await res.json()
    onCreated({ ...created, weekHours: 0, projectCount: 0 })
    setOpen(false)
    setForm({ name: "", email: "", password: "", role: "MEMBER", hourlyRate: "" })
    setL(false)
    router.refresh()
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(34,211,238,0.4)" }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "9px 18px",
        background: "linear-gradient(135deg,#0ea5e9,#22d3ee)", border: "none",
        borderRadius: 8, color: "#000", fontWeight: 600, fontSize: 13, cursor: "pointer",
        transition: "all .2s ease",
      }}
    >
      <UserPlus size={15} /> Ajouter un membre
    </button>
  )

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div style={{ background: dark.panel, border: `1px solid ${dark.border}`, borderRadius: 14, padding: 28, width: 420, maxWidth: "90vw" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: dark.text }}>Nouveau membre</h2>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: dark.sub }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Nom", key: "name", type: "text" },
            { label: "Email", key: "email", type: "email" },
            { label: "Mot de passe", key: "password", type: "password" },
            { label: "Taux horaire ($/h)", key: "hourlyRate", type: "number" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label style={{ fontSize: 12, color: dark.sub, display: "block", marginBottom: 5 }}>{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={set(key)}
                style={{
                  width: "100%", padding: "8px 12px", background: dark.input,
                  border: `1px solid ${dark.border}`, borderRadius: 8,
                  color: dark.text, fontSize: 13, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, color: dark.sub, display: "block", marginBottom: 5 }}>Rôle</label>
            <select
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", background: dark.input, border: `1px solid ${dark.border}`, borderRadius: 8, color: dark.text, fontSize: 13, outline: "none" }}
            >
              <option value="MEMBER">Membre</option>
              <option value="PROJECT_MANAGER">Chef de projet</option>
              <option value="ADMIN">Administrateur</option>
              <option value="VIEWER">Observateur</option>
            </select>
          </div>
          {error && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{error}</p>}
          <button
            type="submit" disabled={loading}
            style={{
              padding: "10px", background: "linear-gradient(135deg,#0ea5e9,#22d3ee)",
              border: "none", borderRadius: 8, color: "#000", fontWeight: 600,
              fontSize: 13, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .7 : 1,
            }}
          >
            {loading ? "Création…" : "Créer le membre"}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Capacity editor ────────────────────────────────────────────────────────────
function CapacityEditor({ memberId, current, label, field, color }: {
  memberId: string; current: number | null; label: string; field: "weeklyCapacity" | "hourlyRate"; color: string
}) {
  const dark = useThemeColors()
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(String(current ?? ""))
  const [saving, setSaving]   = useState(false)

  async function save() {
    setSaving(true)
    await fetch(`/api/equipe/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: parseFloat(val) }),
    })
    setSaving(false); setEditing(false)
  }

  if (!editing) return (
    <div onClick={() => setEditing(true)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 11, color }}>{current ?? "–"}{field === "weeklyCapacity" ? "h/sem" : "$/h"}</span>
    </div>
  )

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input
        autoFocus value={val} onChange={e => setVal(e.target.value)} type="number" min="0"
        style={{ width: 64, padding: "2px 6px", background: dark.input, border: `1px solid ${color}`, borderRadius: 5, color: dark.text, fontSize: 11, outline: "none" }}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false) }}
      />
      <button onClick={save} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: "#4ade80", padding: 2 }}><Check size={12} /></button>
      <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", cursor: "pointer", color: dark.sub, padding: 2 }}><X size={12} /></button>
    </div>
  )
}

// ── Member Card ────────────────────────────────────────────────────────────────
function MemberCard({ m, isAdmin, isSelf }: { m: Member; isAdmin: boolean; isSelf: boolean }) {
  const dark = useThemeColors()
  const ROLE_CFG = getRoleCfg(dark)
  const role  = ROLE_CFG[m.role] ?? ROLE_CFG.MEMBER
  const cap   = m.weeklyCapacity ?? 40
  const load  = cap > 0 ? Math.min(100, (m.weekHours / cap) * 100) : 0
  const loadColor = load >= 100 ? "#f87171" : load >= 80 ? "#fb923c" : "#4ade80"
  const initials = m.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${role.color}15`; e.currentTarget.style.borderColor = role.color + "40" }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = dark.border }}
      style={{
        background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 12,
        padding: "20px", transition: "all .25s cubic-bezier(.34,1.56,.64,1)",
      }}
    >
      {/* Avatar + info */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          background: `${role.color}20`, border: `2px solid ${role.color}40`,
          fontSize: 14, fontWeight: 700, color: role.color, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: dark.text }}>{m.name}</span>
            {isSelf && <span style={{ fontSize: 10, color: "#818cf8", background: "rgba(129,140,248,.15)", border: "1px solid rgba(129,140,248,.3)", borderRadius: 4, padding: "1px 5px" }}>vous</span>}
          </div>
          <p style={{ margin: "2px 0 6px", fontSize: 12, color: dark.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: role.color }}>{role.icon}</span>
            <span style={{ fontSize: 11, color: role.color, background: `${role.color}15`, border: `1px solid ${role.color}30`, borderRadius: 4, padding: "1px 7px" }}>
              {role.label}
            </span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { icon: <FolderKanban size={13} />, label: "Projets",       value: m.projectCount,              color: "#22d3ee" },
          { icon: <CheckSquare size={13} />,  label: "Tâches",        value: m._count.assignedTasks,      color: "#818cf8" },
          { icon: <Clock size={13} />,        label: "Saisies temps", value: m._count.timeEntries,        color: "#4ade80" },
          { icon: <Zap size={13} />,          label: "Cette semaine", value: `${m.weekHours.toFixed(1)}h`,color: loadColor },
        ].map(({ icon, label, value, color }) => (
          <div key={label} style={{ background: dark.card, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color, marginBottom: 4 }}>
              {icon}
              <span style={{ fontSize: 10, color: dark.sub }}>{label}</span>
            </div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Capacity bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: dark.sub }}>Charge cette semaine</span>
          <span style={{ fontSize: 11, color: loadColor, fontWeight: 600 }}>{load.toFixed(0)}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 3, background: dark.hover, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${load}%`, background: loadColor, borderRadius: 3, transition: "width .4s ease" }} />
        </div>
      </div>

      {/* Footer: capacity + hourly rate */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${dark.border}` }}>
        <div style={{ display: "flex", flex: 1, gap: 20 }}>
          <div>
            <p style={{ margin: "0 0 3px", fontSize: 10, color: dark.sub }}>Capacité</p>
            {isAdmin
              ? <CapacityEditor memberId={m.id} current={m.weeklyCapacity} label="Capacité" field="weeklyCapacity" color="#22d3ee" />
              : <span style={{ fontSize: 11, color: "#22d3ee" }}>{m.weeklyCapacity ?? 40}h/sem</span>
            }
          </div>
          {(isAdmin || m.hourlyRate) && (
            <div>
              <p style={{ margin: "0 0 3px", fontSize: 10, color: dark.sub }}>Taux horaire</p>
              {isAdmin
                ? <CapacityEditor memberId={m.id} current={m.hourlyRate} label="Taux" field="hourlyRate" color="#fb923c" />
                : <span style={{ fontSize: 11, color: "#fb923c" }}>{m.hourlyRate ?? "–"}$/h</span>
              }
            </div>
          )}
        </div>
        <Link href={`/charge`} style={{ textDecoration: "none" }}>
          <button
            onMouseEnter={e => e.currentTarget.style.color = "#22d3ee"}
            onMouseLeave={e => e.currentTarget.style.color = dark.sub}
            style={{ background: "none", border: "none", cursor: "pointer", color: dark.sub, display: "flex", alignItems: "center", gap: 4, fontSize: 12, transition: "color .15s" }}
          >
            Charge <ChevronRight size={12} />
          </button>
        </Link>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function EquipeClient({ members: initial, currentUserId, isAdmin }: Props) {
  const dark = useThemeColors()
  const ROLE_CFG = getRoleCfg(dark)
  const [members, setMembers] = useState<Member[]>(initial)
  const [search, setSearch]   = useState("")
  const [filterRole, setRole] = useState("ALL")

  const filtered = useMemo(() => {
    let list = members
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
    }
    if (filterRole !== "ALL") list = list.filter(m => m.role === filterRole)
    return list
  }, [members, search, filterRole])

  const totalHours = members.reduce((s, m) => s + m.weekHours, 0)
  const totalCap   = members.reduce((s, m) => s + (m.weeklyCapacity ?? 40), 0)
  const overloaded = members.filter(m => m.weekHours > (m.weeklyCapacity ?? 40)).length

  const roleBtn = (r: string, label: string, color: string) => (
    <button
      onClick={() => setRole(r)}
      style={{
        padding: "5px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer",
        border: `1px solid ${filterRole === r ? color + "60" : dark.border}`,
        background: filterRole === r ? color + "18" : "transparent",
        color: filterRole === r ? color : dark.sub,
        transition: "all .15s ease",
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ minHeight: "100vh", background: dark.bg, padding: "32px 40px", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Users size={20} color="#22d3ee" />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: dark.text, margin: 0 }}>Équipe</h1>
          </div>
          <p style={{ color: dark.sub, fontSize: 13, margin: 0 }}>
            {members.length} membre{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && <AddMemberDialog onCreated={m => setMembers(p => [m, ...p])} />}
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Membres actifs",        value: members.length,             color: "#22d3ee", icon: <Users size={15} />      },
          { label: "Heures cette semaine",  value: `${totalHours.toFixed(1)}h`, color: "#818cf8", icon: <Clock size={15} />      },
          { label: "Capacité totale/sem",   value: `${totalCap}h`,              color: "#4ade80", icon: <Zap size={15} />        },
          { label: "Membres surchargés",    value: overloaded,                  color: overloaded > 0 ? "#f87171" : "#64748b", icon: <UserCog size={15} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, color }}>
              {icon}
              <span style={{ fontSize: 11, color: dark.sub }}>{label}</span>
            </div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 300 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: dark.sub }} />
          <input
            placeholder="Rechercher un membre…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", paddingLeft: 32, paddingRight: 12, height: 36,
              background: dark.input, border: `1px solid ${dark.border}`, borderRadius: 8,
              color: dark.text, fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {roleBtn("ALL",            "Tous",           "#94a3b8")}
          {roleBtn("ADMIN",          "Admin",          "#f472b6")}
          {roleBtn("PROJECT_MANAGER","Chefs de projet","#22d3ee")}
          {roleBtn("MEMBER",         "Membres",        "#818cf8")}
          {roleBtn("VIEWER",         "Observateurs",   "#64748b")}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: dark.sub }}>
          <Users size={36} style={{ opacity: .3, margin: "0 auto 12px", display: "block" }} />
          <p style={{ margin: 0, fontSize: 14 }}>Aucun membre trouvé</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
          {filtered.map(m => (
            <MemberCard key={m.id} m={m} isAdmin={isAdmin} isSelf={m.id === currentUserId} />
          ))}
        </div>
      )}
    </div>
  )
}
