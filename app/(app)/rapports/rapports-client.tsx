"use client"
import { useThemeColors } from "@/hooks/use-theme-colors"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  FileBarChart2, Plus, Sparkles, DollarSign, Clock, TrendingUp,
  ChevronDown, ChevronUp, Loader2, FileText, Printer, AlertTriangle,
  FileDown, X,
} from "lucide-react"
import { exportWord } from "@/lib/export-rapport"

type Project = { id: string; name: string; code: string }
type Report  = {
  id: string; fiscalYear: number; title: string
  t661Data: any; cricData: any
  project: Project; createdAt: string
}

interface Props {
  reports: Report[]
  projects: Project[]
}

const CURRENT_YEAR = new Date().getFullYear()
const FISCAL_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3]


// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: React.ReactNode }) {
  const dark = useThemeColors()
  return (
    <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <p style={{ margin: 0, fontSize: 11, color: dark.sub }}>{label}</p>
        <span style={{ color }}>{icon}</span>
      </div>
      <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 700, color }}>{value}</p>
      <p style={{ margin: 0, fontSize: 10, color: dark.sub }}>{sub}</p>
    </div>
  )
}

// ── Tab button ─────────────────────────────────────────────────────────────────
function Tab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  const dark = useThemeColors()
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer",
        border: `1px solid ${active ? "rgba(34,211,238,0.4)" : "transparent"}`,
        background: active ? "rgba(34,211,238,0.12)" : "transparent",
        color: active ? "#22d3ee" : dark.sub,
        transition: "all .15s ease", fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function RapportsClient({ reports: initial, projects }: Props) {
  const dark = useThemeColors()
  const router = useRouter()
  const [reports, setReports]               = useState<Report[]>(initial)
  const [showNew, setShowNew]               = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [form, setForm]                     = useState({ projectId: "", fiscalYear: String(CURRENT_YEAR) })
  const [generating, setGenerating]         = useState(false)
  const [generatingAI, setGeneratingAI]     = useState(false)
  const [error, setError]                   = useState("")
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab]           = useState("summary")

  async function handleGenerate() {
    if (!form.projectId || !form.fiscalYear) { setError("Projet et année requis."); return }
    setGenerating(true); setError("")
    const res = await fetch("/api/rapports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (!res.ok) { setError((await res.json()).error ?? "Erreur"); setGenerating(false); return }
    const report = await res.json()
    setReports(p => [report, ...p])
    setSelectedReport(report)
    setShowNew(false)
    setGenerating(false)
    setActiveTab("summary")
    router.refresh()
  }

  async function handleGenerateNarrative(reportId: string) {
    setGeneratingAI(true)
    const res = await fetch(`/api/rapports/${reportId}/generate-narrative`, { method: "POST" })
    if (!res.ok) { setGeneratingAI(false); return }
    const data = await res.json()
    setSelectedReport(prev => prev ? { ...prev, t661Data: { ...prev.t661Data, narratives: data.narratives } } : null)
    setReports(p => p.map(r => r.id === reportId ? { ...r, t661Data: { ...r.t661Data, narratives: data.narratives } } : r))
    setGeneratingAI(false)
  }

  const toggleSection = (key: string) => setExpandedSection(p => ({ ...p, [key]: p[key] === false ? true : false }))

  const t = selectedReport?.t661Data
  const c = selectedReport?.cricData
  const hasNarratives = t?.narratives?.line242

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label style={{ fontSize: 11, color: dark.sub, display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: dark.bg, padding: "32px 40px", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <FileBarChart2 size={20} color="#22d3ee" />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: dark.text, margin: 0 }}>Rapports RS&DE</h1>
          </div>
          <p style={{ color: dark.sub, fontSize: 13, margin: 0 }}>
            Générez vos rapports T661 fédéral et CRIC Québec
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(34,211,238,0.4)" }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 18px",
            background: "linear-gradient(135deg,#0ea5e9,#22d3ee)", border: "none",
            borderRadius: 8, color: "#000", fontWeight: 600, fontSize: 13, cursor: "pointer",
            transition: "all .2s ease",
          }}
        >
          <Plus size={15} /> Nouveau rapport
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>

        {/* Left: report list */}
        <div>
          <p style={{ fontSize: 12, color: dark.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 12 }}>
            Rapports générés
          </p>
          {reports.length === 0 ? (
            <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 12, padding: "32px 16px", textAlign: "center", color: dark.sub }}>
              <FileBarChart2 size={28} style={{ opacity: .3, margin: "0 auto 10px", display: "block" }} />
              <p style={{ margin: 0, fontSize: 13 }}>Aucun rapport</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reports.map(r => {
                const sel = selectedReport?.id === r.id
                return (
                  <div
                    key={r.id}
                    onClick={() => { setSelectedReport(r); setActiveTab("summary") }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = dark.hover }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = dark.card }}
                    style={{
                      background: sel ? "rgba(34,211,238,0.08)" : dark.card,
                      border: `1px solid ${sel ? "rgba(34,211,238,0.4)" : dark.border}`,
                      borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                      transition: "all .15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: sel ? "#22d3ee" : dark.sub }}>{r.project.code}</span>
                      <span style={{ fontSize: 10, color: "#818cf8", background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.25)", borderRadius: 4, padding: "1px 6px" }}>{r.fiscalYear}</span>
                    </div>
                    <p style={{ margin: "4px 0 4px", fontSize: 12, fontWeight: sel ? 600 : 400, color: sel ? dark.text : dark.sub, lineHeight: 1.3 }}>{r.title}</p>
                    <p style={{ margin: 0, fontSize: 10, color: dark.sub }}>{new Date(r.createdAt).toLocaleDateString("fr-CA")}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: report detail */}
        <div>
          {!selectedReport ? (
            <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 12, padding: "60px 32px", textAlign: "center", color: dark.sub }}>
              <FileText size={40} style={{ opacity: .2, margin: "0 auto 14px", display: "block" }} />
              <p style={{ margin: 0, fontSize: 14, color: dark.muted }}>Sélectionnez un rapport ou générez-en un nouveau</p>
            </div>
          ) : (
            <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 12, overflow: "hidden" }}>
              {/* Report header */}
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${dark.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: dark.text }}>{selectedReport.title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: dark.sub }}>Généré le {new Date(selectedReport.createdAt).toLocaleDateString("fr-CA")}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {!hasNarratives && (
                    <button
                      onClick={() => handleGenerateNarrative(selectedReport.id)}
                      disabled={generatingAI}
                      onMouseEnter={e => { if (!generatingAI) e.currentTarget.style.borderColor = "rgba(168,85,247,0.5)" }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(168,85,247,0.25)" }}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                        background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)",
                        borderRadius: 7, color: "#c084fc", fontSize: 12, cursor: generatingAI ? "not-allowed" : "pointer",
                        transition: "border-color .15s", opacity: generatingAI ? .7 : 1,
                      }}
                    >
                      {generatingAI ? <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Génération IA…</> : <><Sparkles size={12} /> Narratifs T661</>}
                    </button>
                  )}
                  <button
                    onClick={() => window.open(`/rapports/${selectedReport.id}/print`, "_blank")}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "transparent", border: `1px solid ${dark.border}`, borderRadius: 7, color: dark.sub, fontSize: 12, cursor: "pointer" }}
                  >
                    <Printer size={12} /> PDF
                  </button>
                  <button
                    onClick={() => exportWord(selectedReport.title, selectedReport.t661Data, selectedReport.cricData)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "transparent", border: `1px solid ${dark.border}`, borderRadius: 7, color: dark.sub, fontSize: 12, cursor: "pointer" }}
                  >
                    <FileDown size={12} /> Word
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ padding: "12px 20px", borderBottom: `1px solid ${dark.border}`, display: "flex", gap: 6 }}>
                <Tab active={activeTab === "summary"} label="Résumé"         onClick={() => setActiveTab("summary")} />
                <Tab active={activeTab === "hours"}   label="Heures RS&DE"   onClick={() => setActiveTab("hours")} />
                <Tab active={activeTab === "t661"}    label="Narratifs T661" onClick={() => setActiveTab("t661")} />
                <Tab active={activeTab === "cric"}    label="CRIC Québec"    onClick={() => setActiveTab("cric")} />
              </div>

              <div style={{ padding: "20px" }}>

                {/* Summary tab */}
                {activeTab === "summary" && t && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                      <StatCard label="Heures RS&DE"       value={`${t.hours.rdDirect}h`}                         sub="R&D directes"           color="#4ade80" icon={<Clock size={14} />} />
                      <StatCard label="Main-d'œuvre élig." value={`${t.costs.salaries.toLocaleString("fr-CA")} $`} sub="Salaires RS&DE"          color="#22d3ee" icon={<DollarSign size={14} />} />
                      <StatCard label="Crédit fédéral"     value={`${t.credits.federal.toLocaleString("fr-CA")} $`} sub="T661 estimé (15%)"      color="#818cf8" icon={<TrendingUp size={14} />} />
                      <StatCard label="CRIC Québec"        value={`${t.credits.cric.toLocaleString("fr-CA")} $`}   sub="Estimé (14%)"           color="#fb923c" icon={<TrendingUp size={14} />} />
                    </div>

                    {/* Total credits banner */}
                    <div style={{ padding: "16px 20px", background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#4ade80" }}>Crédits remboursables estimés (total)</p>
                        <p style={{ margin: 0, fontSize: 11, color: dark.sub }}>Fédéral + CRIC Québec — estimation préliminaire</p>
                      </div>
                      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#4ade80" }}>{t.credits.total.toLocaleString("fr-CA")} $</p>
                    </div>

                    {/* Disclaimer */}
                    <div style={{ padding: "12px 14px", background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 10, display: "flex", gap: 10 }}>
                      <AlertTriangle size={15} color="#fb923c" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ margin: 0, fontSize: 11, color: dark.sub, lineHeight: 1.6 }}>
                        Ces estimations sont préliminaires (15% fédéral + 14% CRIC). Les montants réels dépendent de votre situation fiscale. Consultez un comptable spécialisé RS&DE pour la demande officielle.
                      </p>
                    </div>
                  </div>
                )}

                {/* Hours tab */}
                {activeTab === "hours" && t && (
                  <div>
                    <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 600, color: dark.sub }}>Allocation des heures par employé</p>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${dark.border}` }}>
                            {["Employé", "R&D directe", "Support R&D", "Non admis.", "Total", "% RS&DE"].map((h, i) => (
                              <th key={h} style={{
                                padding: "8px 12px", fontSize: 11, fontWeight: 600, textAlign: i === 0 ? "left" : "right",
                                color: i === 1 ? "#4ade80" : i === 2 ? "#22d3ee" : i === 3 ? dark.muted : dark.sub,
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {t.hours.byEmployee.map((emp: any, i: number) => {
                            const pct = emp.totalHours > 0 ? Math.round(((emp.rdHours + emp.suppHours * 0.8) / emp.totalHours) * 100) : 0
                            return (
                              <tr key={i}
                                onMouseEnter={e => e.currentTarget.style.background = dark.hover}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                style={{ borderBottom: `1px solid ${dark.border}`, transition: "background .1s" }}
                              >
                                <td style={{ padding: "9px 12px", fontSize: 13, fontWeight: 500, color: dark.text }}>{emp.name}</td>
                                <td style={{ padding: "9px 12px", fontSize: 13, textAlign: "right", color: "#4ade80" }}>{emp.rdHours}h</td>
                                <td style={{ padding: "9px 12px", fontSize: 13, textAlign: "right", color: "#22d3ee" }}>{emp.suppHours}h</td>
                                <td style={{ padding: "9px 12px", fontSize: 13, textAlign: "right", color: dark.sub }}>{emp.nonHours}h</td>
                                <td style={{ padding: "9px 12px", fontSize: 13, textAlign: "right", fontWeight: 600, color: dark.sub }}>{emp.totalHours}h</td>
                                <td style={{ padding: "9px 12px", textAlign: "right" }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 70 ? "#4ade80" : pct >= 40 ? "#fb923c" : "#64748b" }}>{pct}%</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: `1px solid ${dark.border}`, background: dark.card }}>
                            <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, color: dark.sub }}>TOTAL</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", fontWeight: 700, color: "#4ade80" }}>{t.hours.rdDirect}h</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", fontWeight: 700, color: "#22d3ee" }}>{t.hours.rdSupport}h</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", fontWeight: 700, color: dark.sub }}>{parseFloat((t.hours.total - t.hours.rdDirect - t.hours.rdSupport).toFixed(2))}h</td>
                            <td style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", fontWeight: 800, color: dark.text }}>{t.hours.total}h</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* T661 narratives tab */}
                {activeTab === "t661" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {!hasNarratives ? (
                      <div style={{ textAlign: "center", padding: "40px 0" }}>
                        <Sparkles size={32} style={{ opacity: .3, margin: "0 auto 14px", display: "block", color: "#c084fc" }} />
                        <p style={{ margin: "0 0 6px", fontSize: 14, color: dark.muted }}>Les narratifs T661 n'ont pas encore été générés.</p>
                        <p style={{ margin: "0 0 16px", fontSize: 12, color: dark.sub }}>Claude génère les narratifs (lignes 242, 244, 246) à partir des données du projet.</p>
                        <button
                          onClick={() => handleGenerateNarrative(selectedReport.id)}
                          disabled={generatingAI}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px",
                            background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "none",
                            borderRadius: 8, color: "#fff", fontWeight: 600, fontSize: 13,
                            cursor: generatingAI ? "not-allowed" : "pointer", opacity: generatingAI ? .7 : 1,
                          }}
                        >
                          {generatingAI ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Génération…</> : <><Sparkles size={14} /> Générer les narratifs</>}
                        </button>
                      </div>
                    ) : (
                      <>
                        {[
                          { key: "line242", line: "Ligne 242", title: "Avancement technologique ou scientifique" },
                          { key: "line244", line: "Ligne 244", title: "Incertitudes technologiques" },
                          { key: "line246", line: "Ligne 246", title: "Travaux effectués" },
                        ].map(({ key, line, title }) => {
                          const text = t.narratives?.[key] ?? ""
                          const wc   = text.trim().split(/\s+/).filter(Boolean).length
                          const isOpen = expandedSection[key] !== false
                          return (
                            <div key={key} style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 10, overflow: "hidden" }}>
                              <div
                                onClick={() => toggleSection(key)}
                                style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                onMouseEnter={e => e.currentTarget.style.background = dark.hover}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                              >
                                <div>
                                  <p style={{ margin: "0 0 2px", fontSize: 10, color: dark.sub, fontWeight: 600 }}>{line}</p>
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: dark.text }}>{title}</p>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12,
                                    color: wc >= 400 ? "#4ade80" : "#fb923c",
                                    background: wc >= 400 ? "rgba(74,222,128,0.12)" : "rgba(251,146,60,0.12)",
                                    border: `1px solid ${wc >= 400 ? "rgba(74,222,128,0.3)" : "rgba(251,146,60,0.3)"}`,
                                  }}>
                                    {wc} mots
                                  </span>
                                  {isOpen ? <ChevronUp size={15} color={dark.sub} /> : <ChevronDown size={15} color={dark.sub} />}
                                </div>
                              </div>
                              {isOpen && (
                                <div style={{ padding: "14px 16px", borderTop: `1px solid ${dark.border}` }}>
                                  <p style={{ margin: 0, fontSize: 13, color: dark.sub, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{text}</p>
                                </div>
                              )}
                            </div>
                          )
                        })}

                        <button
                          onClick={() => handleGenerateNarrative(selectedReport.id)}
                          disabled={generatingAI}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "9px",
                            background: "transparent", border: `1px dashed rgba(168,85,247,0.3)`, borderRadius: 8,
                            color: "#c084fc", fontSize: 12, cursor: generatingAI ? "not-allowed" : "pointer",
                            opacity: generatingAI ? .7 : 1, width: "100%",
                          }}
                        >
                          {generatingAI ? <><Loader2 size={12} /> Régénération…</> : <><Sparkles size={12} /> Régénérer les narratifs</>}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* CRIC tab */}
                {activeTab === "cric" && c && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: dark.sub }}>Crédit d'impôt remboursable CRIC — Québec</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {[
                        { label: "Année fiscale",     value: String(c.fiscalYear), color: dark.sub },
                        { label: "Province",           value: c.province,           color: dark.sub },
                        { label: "Salaires éligibles", value: `${c.eligibleSalaries.toLocaleString("fr-CA")} $`, color: "#22d3ee" },
                        { label: "CRIC estimé (14%)",  value: `${c.cricCredit.toLocaleString("fr-CA")} $`,      color: "#4ade80" },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 10, padding: "14px 16px" }}>
                          <p style={{ margin: "0 0 4px", fontSize: 11, color: dark.sub }}>{label}</p>
                          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: "12px 14px", background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 10, display: "flex", gap: 10 }}>
                      <AlertTriangle size={14} color="#fb923c" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ margin: 0, fontSize: 11, color: dark.sub, lineHeight: 1.6 }}>
                        Le taux CRIC réel varie selon la taille de l'entreprise (14% à 30% pour les PME). Vérifiez avec Revenu Québec et votre comptable.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New report modal */}
      {showNew && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setShowNew(false) }}
        >
          <div style={{ background: dark.panel, border: `1px solid ${dark.border}`, borderRadius: 14, padding: 28, width: 420, maxWidth: "90vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: dark.text }}>Générer un rapport RS&DE</h2>
              <button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", cursor: "pointer", color: dark.sub }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: dark.sub, display: "block", marginBottom: 5 }}>Projet</label>
                <select
                  value={form.projectId}
                  onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", background: dark.input, border: `1px solid ${dark.border}`, borderRadius: 8, color: dark.text, fontSize: 13, outline: "none" }}
                >
                  <option value="">Sélectionner un projet</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: dark.sub, display: "block", marginBottom: 5 }}>Année fiscale</label>
                <select
                  value={form.fiscalYear}
                  onChange={e => setForm(p => ({ ...p, fiscalYear: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", background: dark.input, border: `1px solid ${dark.border}`, borderRadius: 8, color: dark.text, fontSize: 13, outline: "none" }}
                >
                  {FISCAL_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
              {error && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{error}</p>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => setShowNew(false)} style={{ padding: "8px 18px", background: "transparent", border: `1px solid ${dark.border}`, borderRadius: 8, color: dark.sub, fontSize: 13, cursor: "pointer" }}>
                  Annuler
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 18px",
                    background: "linear-gradient(135deg,#0ea5e9,#22d3ee)", border: "none",
                    borderRadius: 8, color: "#000", fontWeight: 600, fontSize: 13,
                    cursor: generating ? "not-allowed" : "pointer", opacity: generating ? .7 : 1,
                  }}
                >
                  {generating ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Génération…</> : "Générer le rapport"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
