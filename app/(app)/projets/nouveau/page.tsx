"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FlaskConical, AlertCircle, Plus } from "lucide-react"
import { useThemeColors } from "@/hooks/use-theme-colors"

type DC = ReturnType<typeof useThemeColors>

function FLabel({ d, children }: { d: DC; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: d.sub, marginBottom: 6 }}>
      {children}
    </label>
  )
}

function FInput({ d, id, ...props }: { d: DC } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      id={id}
      {...props}
      style={{
        width: "100%", padding: "9px 12px",
        background: d.input, border: `1px solid ${d.border}`,
        borderRadius: 8, color: d.text, fontSize: 13, outline: "none",
        boxSizing: "border-box", transition: "border-color 0.2s",
        fontFamily: "inherit",
      }}
      onFocus={e => e.target.style.borderColor = d.accentBorder}
      onBlur={e  => e.target.style.borderColor = d.border}
    />
  )
}

function FTextarea({ d, id, rows = 3, ...props }: { d: DC } & React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number }) {
  return (
    <textarea
      id={id}
      rows={rows}
      {...props}
      style={{
        width: "100%", padding: "9px 12px",
        background: d.input, border: `1px solid ${d.border}`,
        borderRadius: 8, color: d.text, fontSize: 13, outline: "none",
        boxSizing: "border-box", resize: "vertical", lineHeight: 1.5,
        transition: "border-color 0.2s", fontFamily: "inherit",
      }}
      onFocus={e => e.target.style.borderColor = d.accentBorder}
      onBlur={e  => e.target.style.borderColor = d.border}
    />
  )
}

function Section({ d, title, subtitle, children }: { d: DC; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: d.card, border: `1px solid ${d.border}`,
      borderRadius: 12, overflow: "hidden",
      boxShadow: d.shadow,
    }}>
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${d.border}`,
        background: d.hover,
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: d.text }}>{title}</p>
        {subtitle && <p style={{ fontSize: 12, color: d.muted, marginTop: 3 }}>{subtitle}</p>}
      </div>
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {children}
      </div>
    </div>
  )
}

export default function NouveauProjetPage() {
  const router = useRouter()
  const d = useThemeColors()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")
  const [form, setForm] = useState({
    name: "", code: "", description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    objective: "", technicalUncertainties: "", hypotheses: "",
    acceptanceCriteria: "", expectedDeliverables: "",
  })

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res  = await fetch("/api/projets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Erreur lors de la création."); setLoading(false) }
    else router.push(`/projets/${data.id}`)
  }

  return (
    <div style={{ padding: "32px", minHeight: "100vh", background: d.bg }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 28 }}>
          <Link href="/projets">
            <button style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 8,
              border: `1px solid ${d.border}`, background: d.hover,
              cursor: "pointer", flexShrink: 0, marginTop: 4, color: d.sub,
            }}>
              <ArrowLeft style={{ width: 16, height: 16 }} />
            </button>
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                background: d.accentBg,
                border: `1px solid ${d.accentBorder}`,
              }}>
                <FlaskConical style={{ width: 16, height: 16, color: d.accent }} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: d.text }}>Nouveau projet R&D</h1>
            </div>
            <p style={{ fontSize: 13, color: d.muted }}>
              Remplissez les informations de base et la charte du projet
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Infos générales */}
          <Section d={d} title="Informations générales">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / 2" }}>
                <FLabel d={d}>Nom du projet *</FLabel>
                <FInput d={d} id="name" placeholder="Ex: Développement algorithme IA" value={form.name} onChange={set("name")} required />
              </div>
              <div>
                <FLabel d={d}>Code projet *</FLabel>
                <FInput d={d} id="code" placeholder="Ex: RD-2026-001" value={form.code} onChange={set("code")} required />
              </div>
            </div>
            <div>
              <FLabel d={d}>Description</FLabel>
              <FTextarea d={d} id="description" placeholder="Description courte du projet…" value={form.description} onChange={set("description")} rows={2} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <FLabel d={d}>Date de début *</FLabel>
                <FInput d={d} id="startDate" type="date" value={form.startDate} onChange={set("startDate")} required />
              </div>
              <div>
                <FLabel d={d}>Date de fin prévue</FLabel>
                <FInput d={d} id="endDate" type="date" value={form.endDate} onChange={set("endDate")} />
              </div>
            </div>
          </Section>

          {/* Charte RS&DE */}
          <Section
            d={d}
            title="Charte RS&DE"
            subtitle="Ces informations documentent l'admissibilité du projet pour les crédits d'impôt RS&DE"
          >
            <div>
              <FLabel d={d}>Objectif scientifique/technologique *</FLabel>
              <FTextarea d={d} id="objective" placeholder="Quel problème technique ou scientifique cherchez-vous à résoudre ?" value={form.objective} onChange={set("objective")} rows={3} required />
            </div>
            <div>
              <FLabel d={d}>Incertitudes technologiques *</FLabel>
              <FTextarea d={d} id="uncertainties" placeholder="Quelles sont les incertitudes que vous devez surmonter ? Pourquoi ce problème ne peut pas être résolu par les techniques existantes ?" value={form.technicalUncertainties} onChange={set("technicalUncertainties")} rows={3} required />
            </div>
            <div>
              <FLabel d={d}>Hypothèses de travail *</FLabel>
              <FTextarea d={d} id="hypotheses" placeholder="Quelles approches allez-vous explorer pour résoudre les incertitudes ?" value={form.hypotheses} onChange={set("hypotheses")} rows={3} required />
            </div>
            <div>
              <FLabel d={d}>Critères d'acceptation *</FLabel>
              <FTextarea d={d} id="criteria" placeholder="Comment saurez-vous que le projet a réussi ? Quels sont les indicateurs mesurables ?" value={form.acceptanceCriteria} onChange={set("acceptanceCriteria")} rows={3} required />
            </div>
            <div>
              <FLabel d={d}>Livrables attendus *</FLabel>
              <FTextarea d={d} id="deliverables" placeholder="Quels sont les résultats concrets attendus (prototypes, rapports, code, algorithmes, etc.) ?" value={form.expectedDeliverables} onChange={set("expectedDeliverables")} rows={3} required />
            </div>
          </Section>

          {/* Erreur */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: 8, padding: "10px 14px",
            }}>
              <AlertCircle style={{ width: 14, height: 14, color: "#f87171", flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: "#f87171" }}>{error}</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Link href="/projets">
              <button type="button" style={{
                padding: "9px 18px", borderRadius: 8,
                border: `1px solid ${d.border}`, background: d.hover,
                color: d.sub, fontSize: 13, cursor: "pointer",
              }}>
                Annuler
              </button>
            </Link>
            <button type="submit" disabled={loading} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 20px", borderRadius: 8, border: "none",
              background: loading ? d.accentBg : "linear-gradient(135deg, #22d3ee, #06b6d4)",
              color: "#000", fontSize: 13, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}>
              {!loading && <Plus style={{ width: 14, height: 14 }} />}
              {loading ? "Création…" : "Créer le projet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
