"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FlaskConical, Building2, User, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react"

export default function RegisterPage() {
  const router  = useRouter()
  const [form, setForm]     = useState({ name: "", email: "", password: "", organizationName: "" })
  const [error, setError]   = useState("")
  const [loading, setLoading] = useState(false)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res  = await fetch("/api/auth/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false) }
    else router.push("/login?registered=1")
  }

  const fields = [
    { key: "organizationName", label: "Organisation",   type: "text",     placeholder: "Nom de votre entreprise",  Icon: Building2 },
    { key: "name",             label: "Votre nom",      type: "text",     placeholder: "Prénom Nom",               Icon: User },
    { key: "email",            label: "Email",          type: "email",    placeholder: "vous@exemple.com",         Icon: Mail },
    { key: "password",         label: "Mot de passe",   type: "password", placeholder: "Min. 8 caractères",        Icon: Lock },
  ] as const

  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <div style={{
        background:     "rgba(13,25,41,0.9)",
        border:         "1px solid rgba(255,255,255,0.1)",
        borderRadius:   16,
        padding:        "40px 36px",
        backdropFilter: "blur(20px)",
        boxShadow:      "0 32px 80px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{
            background:   "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(34,211,238,0.2))",
            border:       "1px solid rgba(139,92,246,0.3)",
            borderRadius: 14,
            padding:      12,
            marginBottom: 16,
          }}>
            <FlaskConical style={{ width: 28, height: 28, color: "#a78bfa" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Créer un compte</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>Démarrez votre espace R&D</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {fields.map(({ key, label, type, placeholder, Icon }) => (
            <div key={key}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>
                {label}
              </label>
              <div style={{ position: "relative" }}>
                <Icon style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#475569" }} />
                <input
                  type={type}
                  value={form[key]}
                  onChange={set(key)}
                  placeholder={placeholder}
                  required
                  minLength={key === "password" ? 8 : undefined}
                  style={{
                    width:        "100%",
                    padding:      "10px 12px 10px 38px",
                    background:   "rgba(255,255,255,0.05)",
                    border:       "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color:        "#e2e8f0",
                    fontSize:     14,
                    outline:      "none",
                    boxSizing:    "border-box",
                    transition:   "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(167,139,250,0.5)"}
                  onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </div>
            </div>
          ))}

          {error && (
            <div style={{
              display:      "flex",
              alignItems:   "center",
              gap:          8,
              background:   "rgba(248,113,113,0.1)",
              border:       "1px solid rgba(248,113,113,0.2)",
              borderRadius: 8,
              padding:      "8px 12px",
            }}>
              <AlertCircle style={{ width: 14, height: 14, color: "#f87171", flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: "#f87171" }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            8,
              padding:        "11px 20px",
              background:     loading ? "rgba(167,139,250,0.3)" : "linear-gradient(135deg, #a78bfa, #8b5cf6)",
              border:         "none",
              borderRadius:   8,
              color:          "#fff",
              fontSize:       14,
              fontWeight:     600,
              cursor:         loading ? "not-allowed" : "pointer",
              marginTop:      4,
            }}
          >
            {loading ? "Création…" : (
              <>Créer mon compte <ArrowRight style={{ width: 15, height: 15 }} /></>
            )}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "#475569", marginTop: 24 }}>
          Déjà un compte ?{" "}
          <Link href="/login" style={{ color: "#a78bfa", fontWeight: 500, textDecoration: "none" }}>
            Se connecter
          </Link>
        </p>
      </div>

      <p style={{ textAlign: "center", fontSize: 11, color: "#1e293b", marginTop: 20 }}>
        Plateforme R&D conforme RS&DE / T661
      </p>
    </div>
  )
}
