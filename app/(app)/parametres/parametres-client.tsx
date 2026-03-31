"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import {
  Settings, Mail, Bell, CheckCircle2, XCircle, Loader2,
  Eye, EyeOff, Send, Save, Shield, Sun, Moon, Monitor,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"

type OrgSettings = {
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPassSet: boolean
  smtpFrom: string
  notifyBudget90: boolean
  notifyBudget100: boolean
}

type Props = {
  orgName: string
  currentUserRole: string
  initialSettings: OrgSettings
}

function useT() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  return {
    isDark,
    bg:     isDark ? "#060d1a"                  : "#f8fafc",
    card:   isDark ? "rgba(255,255,255,0.04)"   : "#ffffff",
    border: isDark ? "rgba(255,255,255,0.08)"   : "#e2e8f0",
    sub:    isDark ? "#64748b"                  : "#64748b",
    input:  isDark ? "rgba(255,255,255,0.05)"   : "#f1f5f9",
    inputBorder: isDark ? "rgba(255,255,255,0.12)" : "#e2e8f0",
    textPrimary:   isDark ? "#e2e8f0" : "#0f172a",
    textSecondary: isDark ? "#94a3b8" : "#334155",
    accent:  isDark ? "#22d3ee" : "#0369a1",
    accentBg: isDark ? "rgba(34,211,238,0.12)" : "rgba(3,105,161,0.08)",
    accentBorder: isDark ? "rgba(34,211,238,0.25)" : "rgba(3,105,161,0.2)",
    rowBg:  isDark ? "rgba(255,255,255,0.02)"  : "#f8fafc",
  }
}

function Field({ label, hint, sub, children }: { label: string; hint?: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: sub ?? "#94a3b8", display: "block", marginBottom: 5, fontWeight: 600 }}>{label}</label>
      {children}
      {hint && <p style={{ margin: "4px 0 0", fontSize: 11, color: sub ?? "#64748b" }}>{hint}</p>}
    </div>
  )
}

function FInput({
  value, onChange, placeholder, type = "text", disabled = false, extra, t,
}: {
  value: string; onChange?: (v: string) => void; placeholder?: string
  type?: string; disabled?: boolean; extra?: React.ReactNode
  t: ReturnType<typeof useT>
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={e => onChange?.(e.target.value)}
        style={{
          width: "100%", padding: "8px 12px", paddingRight: extra ? 40 : 12,
          background: disabled ? (t.isDark ? "rgba(255,255,255,0.02)" : "#f8fafc") : t.input,
          border: `1px solid ${t.inputBorder}`, borderRadius: 8,
          color: disabled ? "#94a3b8" : t.textPrimary, fontSize: 13,
          outline: "none", boxSizing: "border-box" as const,
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
      {extra && <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>{extra}</div>}
    </div>
  )
}

function Section({ icon, title, desc, children, t }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode; t: ReturnType<typeof useT> }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden", boxShadow: t.isDark ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ color: t.accent, marginTop: 2 }}>{icon}</div>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{title}</p>
          <p style={{ margin: 0, fontSize: 12, color: t.sub, lineHeight: 1.5 }}>{desc}</p>
        </div>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  )
}

export function ParametresClient({ orgName, currentUserRole, initialSettings }: Props) {
  const router = useRouter()
  const isAdmin = currentUserRole === "ADMIN"
  const t = useT()
  const { theme, setTheme } = useTheme()

  const [smtpHost,  setSmtpHost]  = useState(initialSettings.smtpHost)
  const [smtpPort,  setSmtpPort]  = useState(String(initialSettings.smtpPort))
  const [smtpSecure,setSmtpSecure]= useState(initialSettings.smtpSecure)
  const [smtpUser,  setSmtpUser]  = useState(initialSettings.smtpUser)
  const [smtpPass,  setSmtpPass]  = useState("")
  const [smtpFrom,  setSmtpFrom]  = useState(initialSettings.smtpFrom)
  const [showPass,  setShowPass]  = useState(false)
  const [passIsSet, setPassIsSet] = useState(initialSettings.smtpPassSet)

  const [notify90,  setNotify90]  = useState(initialSettings.notifyBudget90)
  const [notify100, setNotify100] = useState(initialSettings.notifyBudget100)

  const [saving,      setSaving]      = useState(false)
  const [testing,     setTesting]     = useState(false)
  const [testResult,  setTestResult]  = useState<{ ok: boolean; error?: string } | null>(null)
  const [saved,       setSaved]       = useState(false)

  async function handleSave() {
    setSaving(true); setSaved(false)
    try {
      const res = await fetch("/api/parametres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost, smtpPort: parseInt(smtpPort) || 587, smtpSecure,
          smtpUser, smtpPass, smtpFrom,
          notifyBudget90: notify90, notifyBudget100: notify100,
        }),
      })
      if (res.ok) {
        setSaved(true)
        if (smtpPass) setPassIsSet(true)
        setSmtpPass("")
        router.refresh()
        setTimeout(() => setSaved(false), 3000)
      }
    } finally { setSaving(false) }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch("/api/parametres", { method: "POST" })
      setTestResult(await res.json())
    } finally { setTesting(false) }
  }

  const notifRow = (label: string, subText: string, checked: boolean, onChange: (v: boolean) => void) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "14px 16px", background: t.rowBg,
      border: `1px solid ${t.border}`, borderRadius: 10,
    }}>
      <div>
        <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: t.textPrimary }}>{label}</p>
        <p style={{ margin: 0, fontSize: 11, color: t.sub }}>{subText}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={!isAdmin} />
    </div>
  )

  const THEMES = [
    { id: "light" as const, label: "Clair",  icon: Sun,     desc: "Interface blanche et lisible" },
    { id: "dark"  as const, label: "Sombre", icon: Moon,    desc: "Mode nuit futuriste" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: t.bg, padding: "32px 40px", paddingBottom: 60, maxWidth: 820 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div style={{ background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: 10, padding: 10 }}>
          <Settings size={20} color={t.accent} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: t.textPrimary }}>Paramètres</h1>
          <p style={{ margin: 0, fontSize: 13, color: t.sub }}>{orgName}</p>
        </div>
      </div>

      {/* Non-admin warning */}
      {!isAdmin && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)",
          borderRadius: 10, marginBottom: 20,
        }}>
          <Shield size={15} color="#fb923c" />
          <p style={{ margin: 0, fontSize: 13, color: "#fb923c" }}>Seuls les administrateurs peuvent modifier les paramètres.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Appearance Section ── */}
        <Section t={t} icon={<Monitor size={18} />} title="Apparence" desc="Choisissez l'thème de l'interface. La préférence est sauvegardée dans votre navigateur.">
          <div style={{ display: "flex", gap: 12 }}>
            {THEMES.map(({ id, label, icon: Icon, desc: d }) => {
              const active = theme === id
              return (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                    padding: "20px 16px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
                    background: active ? t.accentBg : t.rowBg,
                    border: `2px solid ${active ? t.accent : t.border}`,
                    boxShadow: active ? `0 0 0 3px ${t.accentBorder}` : "none",
                  }}
                >
                  {/* Preview box */}
                  <div style={{
                    width: 80, height: 50, borderRadius: 8, overflow: "hidden",
                    border: `1px solid ${t.border}`,
                    background: id === "dark" ? "#060d1a" : "#f8fafc",
                    display: "flex", flexDirection: "column",
                  }}>
                    <div style={{ height: 14, background: id === "dark" ? "#0d1929" : "#ffffff", borderBottom: `1px solid ${id === "dark" ? "rgba(255,255,255,0.06)" : "#e2e8f0"}`, display: "flex", alignItems: "center", padding: "0 6px", gap: 3 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: id === "dark" ? "#22d3ee" : "#0369a1" }} />
                      <div style={{ flex: 1, height: 2, background: id === "dark" ? "rgba(255,255,255,0.1)" : "#e2e8f0", borderRadius: 2 }} />
                    </div>
                    <div style={{ flex: 1, padding: "4px 6px", display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ height: 3, width: "70%", background: id === "dark" ? "rgba(255,255,255,0.15)" : "#94a3b8", borderRadius: 2 }} />
                      <div style={{ height: 3, width: "50%", background: id === "dark" ? "rgba(34,211,238,0.5)" : "#0369a1", borderRadius: 2 }} />
                      <div style={{ height: 3, width: "60%", background: id === "dark" ? "rgba(255,255,255,0.08)" : "#e2e8f0", borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon size={14} color={active ? t.accent : t.sub} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: active ? t.accent : t.textPrimary }}>{label}</span>
                    {active && <CheckCircle2 size={12} color={t.accent} />}
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: t.sub, textAlign: "center" }}>{d}</p>
                </button>
              )
            })}
          </div>
        </Section>

        {/* ── SMTP Section ── */}
        <Section t={t}
          icon={<Mail size={18} />}
          title="Configuration email (SMTP)"
          desc="Configurez le serveur email pour les notifications (approbations, alertes budget, etc.)."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
              <Field label="Serveur SMTP" sub={t.sub}>
                <FInput t={t} value={smtpHost} onChange={setSmtpHost} placeholder="smtp.gmail.com" disabled={!isAdmin} />
              </Field>
              <Field label="Port" sub={t.sub}>
                <FInput t={t} type="number" value={smtpPort} onChange={setSmtpPort} placeholder="587" disabled={!isAdmin} />
              </Field>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: t.rowBg, border: `1px solid ${t.border}`, borderRadius: 8 }}>
              <Switch checked={smtpSecure} onCheckedChange={setSmtpSecure} disabled={!isAdmin} id="smtp-secure" />
              <label htmlFor="smtp-secure" style={{ fontSize: 13, color: t.sub, cursor: isAdmin ? "pointer" : "default" }}>
                Connexion sécurisée SSL/TLS (port 465)
              </label>
            </div>

            <div style={{ height: 1, background: t.border }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Utilisateur SMTP" sub={t.sub}>
                <FInput t={t} value={smtpUser} onChange={setSmtpUser} placeholder="noreply@monentreprise.ca" disabled={!isAdmin} />
              </Field>
              <Field label={passIsSet ? "Mot de passe (configuré ✓)" : "Mot de passe"} sub={t.sub}>
                <FInput
                  t={t}
                  type={showPass ? "text" : "password"}
                  value={smtpPass}
                  onChange={setSmtpPass}
                  placeholder={passIsSet ? "Laisser vide pour conserver" : "Mot de passe app"}
                  disabled={!isAdmin}
                  extra={
                    <button onClick={() => setShowPass(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: t.sub, padding: 0 }}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
              </Field>
            </div>

            <Field label="Expéditeur" hint="Laisser vide pour utiliser l'adresse utilisateur SMTP." sub={t.sub}>
              <FInput
                t={t}
                value={smtpFrom}
                onChange={setSmtpFrom}
                placeholder={`"R&D Manager" <noreply@monentreprise.ca>`}
                disabled={!isAdmin}
              />
            </Field>

            {/* Test result */}
            {testResult && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                background: testResult.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                border: `1px solid ${testResult.ok ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
                borderRadius: 8, fontSize: 13,
                color: testResult.ok ? (t.isDark ? "#4ade80" : "#059669") : (t.isDark ? "#f87171" : "#dc2626"),
              }}>
                {testResult.ok
                  ? <><CheckCircle2 size={14} /> Connexion SMTP réussie ✓</>
                  : <><XCircle size={14} /> {testResult.error ?? "Connexion échouée"}</>
                }
              </div>
            )}

            {isAdmin && (
              <div style={{ paddingTop: 4 }}>
                <button
                  onClick={handleTest}
                  disabled={testing || !smtpHost}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
                    background: t.rowBg, border: `1px solid ${t.border}`,
                    borderRadius: 8, color: t.sub, fontSize: 13,
                    cursor: (testing || !smtpHost) ? "not-allowed" : "pointer",
                    opacity: (testing || !smtpHost) ? .5 : 1,
                  }}
                >
                  {testing ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Test en cours…</> : <><Send size={13} /> Tester la connexion</>}
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* ── Notifications Section ── */}
        <Section t={t}
          icon={<Bell size={18} />}
          title="Notifications budget"
          desc="Alertes automatiques envoyées aux chefs de projet et administrateurs."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notifRow(
              "Alerte à 90% du budget",
              "Notification lorsqu'un projet atteint 90% de son budget prévu.",
              notify90, setNotify90,
            )}
            {notifRow(
              "Alerte à 100% du budget (dépassement)",
              "Notification lorsqu'un projet dépasse son budget prévu.",
              notify100, setNotify100,
            )}
          </div>
        </Section>

        {/* Save */}
        {isAdmin && (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 }}>
            {saved && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.isDark ? "#4ade80" : "#059669" }}>
                <CheckCircle2 size={13} /> Paramètres enregistrés
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 20px",
                background: t.isDark ? "linear-gradient(135deg,#0ea5e9,#22d3ee)" : "linear-gradient(135deg,#0369a1,#0ea5e9)",
                border: "none", borderRadius: 8,
                color: t.isDark ? "#000" : "#fff",
                fontWeight: 600, fontSize: 13,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? .7 : 1, transition: "all .2s ease",
              }}
            >
              {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Enregistrement…</> : <><Save size={14} /> Enregistrer</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
