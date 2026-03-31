"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FlaskConical, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const router  = useRouter()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const result = await signIn("credentials", { email, password, redirect: false })
    if (result?.error) {
      setError("Email ou mot de passe incorrect.")
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      {/* Card */}
      <div style={{
        background:   "rgba(13,25,41,0.9)",
        border:       "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        padding:      "40px 36px",
        backdropFilter: "blur(20px)",
        boxShadow:    "0 32px 80px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{
            background:   "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(139,92,246,0.2))",
            border:       "1px solid rgba(34,211,238,0.3)",
            borderRadius: 14,
            padding:      12,
            marginBottom: 16,
          }}>
            <FlaskConical style={{ width: 28, height: 28, color: "#22d3ee" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>R&D Project Manager</h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>Connectez-vous à votre espace de travail</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>
              Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#475569" }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
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
                onFocus={e  => e.target.style.borderColor = "rgba(34,211,238,0.5)"}
                onBlur={e   => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>
              Mot de passe
            </label>
            <div style={{ position: "relative" }}>
              <Lock style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#475569" }} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
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
                onFocus={e => e.target.style.borderColor = "rgba(34,211,238,0.5)"}
                onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
            </div>
          </div>

          {/* Error */}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            8,
              padding:        "11px 20px",
              background:     loading ? "rgba(34,211,238,0.3)" : "linear-gradient(135deg, #22d3ee, #06b6d4)",
              border:         "none",
              borderRadius:   8,
              color:          "#000",
              fontSize:       14,
              fontWeight:     600,
              cursor:         loading ? "not-allowed" : "pointer",
              transition:     "opacity 0.2s",
              marginTop:      4,
            }}
          >
            {loading ? "Connexion…" : (
              <>Se connecter <ArrowRight style={{ width: 15, height: 15 }} /></>
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: "center", fontSize: 13, color: "#475569", marginTop: 24 }}>
          Pas encore de compte ?{" "}
          <Link href="/register" style={{ color: "#22d3ee", fontWeight: 500, textDecoration: "none" }}>
            Créer un compte
          </Link>
        </p>
      </div>

      {/* Deco bottom */}
      <p style={{ textAlign: "center", fontSize: 11, color: "#1e293b", marginTop: 20 }}>
        Plateforme R&D conforme RS&DE / T661
      </p>
    </div>
  )
}
