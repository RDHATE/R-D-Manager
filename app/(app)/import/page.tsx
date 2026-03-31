import Link from "next/link"
import { requireAuth } from "@/lib/session"
import { ArrowUpFromLine, CheckCircle2, ChevronRight } from "lucide-react"

export default async function ImportPage() {
  await requireAuth()

  const sources = [
    {
      id:       "clickup",
      name:     "ClickUp",
      logo:     "🟣",
      desc:     "Importez vos espaces, listes, tâches, sous-tâches et jalons depuis ClickUp via l'API.",
      features: ["Projets & listes", "Tâches & sous-tâches", "Jalons", "Priorités & statuts", "Dates d'échéance"],
      status:   "available",
      href:     "/import/clickup",
      color:    "#818cf8",
    },
    {
      id:       "jira",
      name:     "Jira",
      logo:     "🔵",
      desc:     "Import des projets Jira, épopées, stories et sprints.",
      features: ["Projets", "Épopées & stories", "Sprints"],
      status:   "soon",
      href:     "#",
      color:    "#22d3ee",
    },
    {
      id:       "asana",
      name:     "Asana",
      logo:     "🌸",
      desc:     "Import des projets Asana, sections et tâches.",
      features: ["Projets & sections", "Tâches", "Jalons"],
      status:   "soon",
      href:     "#",
      color:    "#f472b6",
    },
    {
      id:       "csv",
      name:     "CSV",
      logo:     "📄",
      desc:     "Importez vos données depuis n'importe quel logiciel via export CSV.",
      features: ["Format universel", "Mapping personnalisé"],
      status:   "soon",
      href:     "#",
      color:    "#4ade80",
    },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)", padding: "32px 40px", paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <div style={{ background: "var(--accent-cyan-subtle)", border: "1px solid var(--accent-cyan-border)", borderRadius: 10, padding: 10 }}>
          <ArrowUpFromLine size={20} color="var(--accent-cyan)" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Importer des projets</h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--sub-text)" }}>Transférez vos projets existants vers R&D Manager</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 16, maxWidth: 900 }}>
        {sources.map(src => {
          const available = src.status === "available"
          const cardInner = (
            <div style={{
              background: "var(--card-bg)",
              border: `1px solid ${available ? src.color + "30" : "var(--card-border)"}`,
              borderRadius: 14, padding: "22px", height: "100%", boxSizing: "border-box" as const,
              opacity: available ? 1 : 0.55,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{src.logo}</span>
                  <div>
                    <p style={{ margin: "0 0 5px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{src.name}</p>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12,
                      color: available ? "#4ade80" : "var(--sub-text)",
                      background: available ? "rgba(74,222,128,0.12)" : "rgba(100,116,139,0.12)",
                      border: `1px solid ${available ? "rgba(74,222,128,0.3)" : "rgba(100,116,139,0.2)"}`,
                    }}>
                      {available ? "Disponible" : "Bientôt"}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--sub-text)", lineHeight: 1.6 }}>{src.desc}</p>

              <ul style={{ margin: "0 0 18px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {src.features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--text-muted)" }}>
                    <CheckCircle2 size={12} color={available ? src.color : "var(--sub-text)"} style={{ flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              {available ? (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "9px", background: `${src.color}18`, border: `1px solid ${src.color}40`,
                  borderRadius: 8, color: src.color, fontSize: 13, fontWeight: 600,
                }}>
                  Importer depuis {src.name} <ChevronRight size={14} />
                </div>
              ) : (
                <div style={{
                  padding: "9px", background: "var(--hover-bg)",
                  border: "1px solid var(--card-border)", borderRadius: 8,
                  color: "var(--sub-text)", fontSize: 13, textAlign: "center",
                }}>
                  Bientôt disponible
                </div>
              )}
            </div>
          )

          return available ? (
            <Link
              key={src.id}
              href={src.href}
              style={{ textDecoration: "none", display: "block", transition: "transform .25s cubic-bezier(.34,1.56,.64,1)" }}
              onMouseEnter={() => {}}
            >
              {cardInner}
            </Link>
          ) : (
            <div key={src.id}>{cardInner}</div>
          )
        })}
      </div>
    </div>
  )
}
