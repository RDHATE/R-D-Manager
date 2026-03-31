"use client"

import { useEffect } from "react"

type Report = {
  id: string; fiscalYear: number; title: string
  t661Data: any; cricData: any
  project: { id: string; name: string; code: string }
  createdAt: string
}

export function PrintClient({ report }: { report: Report }) {
  const t = report.t661Data
  const c = report.cricData

  useEffect(() => {
    setTimeout(() => window.print(), 500)
  }, [])

  const fmt = (n: number) =>
    n.toLocaleString("fr-CA", { minimumFractionDigits: 2 }) + " $"

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 2cm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #0f172a; margin: 0; padding: 0; }
        .page { max-width: 800px; margin: 0 auto; padding: 40px; }
        h1 { color: #1e40af; font-size: 20pt; border-bottom: 2px solid #1e40af; padding-bottom: 6px; margin-top: 30px; }
        h2 { color: #1e3a8a; font-size: 13pt; margin-top: 20px; margin-bottom: 8px; }
        .cover { text-align: center; padding: 60px 0 40px; border-bottom: 3px solid #1e40af; margin-bottom: 40px; }
        .cover-title { font-size: 26pt; font-weight: 900; color: #1e40af; }
        .cover-sub { font-size: 13pt; color: #334155; margin-top: 8px; }
        .cover-proj { font-size: 16pt; font-weight: 700; margin-top: 16px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 16px 0; }
        .stat-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
        .stat-label { font-size: 9pt; color: #64748b; }
        .stat-value { font-size: 16pt; font-weight: 700; color: #1e40af; }
        .stat-sub { font-size: 9pt; color: #94a3b8; }
        .total-box { background: #eff6ff; border: 2px solid #1e40af; border-radius: 8px; padding: 16px; margin: 16px 0; display: flex; justify-content: space-between; align-items: center; }
        .total-label { font-size: 13pt; font-weight: 700; color: #1e40af; }
        .total-value { font-size: 22pt; font-weight: 900; color: #1e40af; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
        th { background: #1e40af; color: white; padding: 8px 12px; text-align: left; }
        td { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
        tr.total-row td { background: #e2e8f0; font-weight: 700; }
        .narrative { line-height: 1.7; margin: 12px 0 20px; font-size: 11pt; }
        .hyp { border-left: 3px solid #1e40af; padding: 10px 14px; margin: 10px 0; background: #f8fafc; }
        .hyp-title { font-weight: 700; }
        .hyp-pivot { color: #d97706; font-style: italic; margin-top: 6px; font-size: 10pt; }
        .alert { background: #fef9c3; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 14px; margin: 12px 0; font-size: 10pt; }
        .print-btn { position: fixed; top: 20px; right: 20px; background: #1e40af; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 11pt; font-weight: 600; }
      `}</style>

      <button className="print-btn no-print" onClick={() => window.print()}>
        Imprimer / Enregistrer PDF
      </button>

      <div className="page">
        {/* Page de couverture */}
        <div className="cover">
          <div className="cover-title">RAPPORT RS&DE</div>
          <div className="cover-sub">Formulaire T661 fédéral + CRIC Québec</div>
          <div className="cover-sub">Année fiscale {t.fiscalYear}</div>
          <div className="cover-proj">{report.project.name}</div>
          <div className="cover-sub" style={{ marginTop: 8 }}>Code : {report.project.code}</div>
          <div className="cover-sub" style={{ color: "#94a3b8", marginTop: 24 }}>
            Généré le {new Date(report.createdAt).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* 1. Résumé financier */}
        <h1>1. Résumé financier RS&DE</h1>
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-label">Heures R&D directes</div>
            <div className="stat-value" style={{ color: "#059669" }}>{t.hours.rdDirect}h</div>
            <div className="stat-sub">Support : {t.hours.rdSupport}h</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Coûts main-d'œuvre éligibles</div>
            <div className="stat-value" style={{ color: "#1e40af" }}>{fmt(t.costs.salaries)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Crédit fédéral T661 (15%)</div>
            <div className="stat-value" style={{ color: "#7c3aed" }}>{fmt(t.credits.federal)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">CRIC Québec (14%)</div>
            <div className="stat-value" style={{ color: "#d97706" }}>{fmt(t.credits.cric)}</div>
          </div>
        </div>
        <div className="total-box">
          <div className="total-label">Total crédits remboursables estimés</div>
          <div className="total-value">{fmt(t.credits.total)}</div>
        </div>
        <div className="alert">
          ⚠️ Estimation préliminaire (15% fédéral + 14% CRIC). Les montants réels dépendent de votre situation fiscale. Consultez un comptable spécialisé RS&DE.
        </div>

        {/* 2. Heures par employé */}
        <h1>2. Allocation des heures par employé</h1>
        <table>
          <thead>
            <tr>
              <th>Employé</th>
              <th>R&D directe</th>
              <th>Support R&D</th>
              <th>Non admis.</th>
              <th>Total</th>
              <th>% RS&DE</th>
            </tr>
          </thead>
          <tbody>
            {t.hours.byEmployee.map((e: any, i: number) => {
              const pct = e.totalHours > 0 ? Math.round(((e.rdHours + e.suppHours * 0.8) / e.totalHours) * 100) : 0
              return (
                <tr key={i}>
                  <td><strong>{e.name}</strong></td>
                  <td>{e.rdHours}h</td>
                  <td>{e.suppHours}h</td>
                  <td>{e.nonHours}h</td>
                  <td><strong>{e.totalHours}h</strong></td>
                  <td><strong>{pct}%</strong></td>
                </tr>
              )
            })}
            <tr className="total-row">
              <td>TOTAL</td>
              <td>{t.hours.rdDirect}h</td>
              <td>{t.hours.rdSupport}h</td>
              <td>{parseFloat((t.hours.total - t.hours.rdDirect - t.hours.rdSupport).toFixed(2))}h</td>
              <td>{t.hours.total}h</td>
              <td />
            </tr>
          </tbody>
        </table>

        {/* 3. Narratifs T661 */}
        <h1>3. Narratifs T661</h1>
        {t.narratives?.line242 ? (
          <>
            <h2>Ligne 242 — Avancement technologique ou scientifique</h2>
            <div className="narrative">{t.narratives.line242}</div>
            <h2>Ligne 244 — Incertitudes technologiques</h2>
            <div className="narrative">{t.narratives.line244}</div>
            <h2>Ligne 246 — Travaux effectués</h2>
            <div className="narrative">{t.narratives.line246}</div>
          </>
        ) : (
          <p style={{ color: "#94a3b8", fontStyle: "italic" }}>
            Narratifs non générés. Utilisez le bouton "Générer narratifs T661" dans l'application.
          </p>
        )}

        {/* 4. Hypothèses */}
        {t.hypotheses?.length > 0 && (
          <>
            <h1>4. Hypothèses de travail</h1>
            {t.hypotheses.map((h: any, i: number) => (
              <div key={i} className="hyp">
                <div className="hyp-title">v{h.version} — {h.title} <span style={{ fontWeight: 400, color: h.status === "ACTIVE" ? "#059669" : h.status === "ABANDONED" ? "#d97706" : "#94a3b8", fontSize: "10pt" }}>[{h.status}]</span></div>
                <div style={{ marginTop: 4, fontSize: "10pt" }}>{h.description}</div>
                {h.pivotReason && <div className="hyp-pivot">Pivot : {h.pivotReason}</div>}
              </div>
            ))}
          </>
        )}

        {/* 5. CRIC */}
        <h1>5. CRIC — Crédit Québec</h1>
        <table>
          <tbody>
            <tr><td><strong>Province</strong></td><td>{c.province}</td></tr>
            <tr><td><strong>Année fiscale</strong></td><td>{c.fiscalYear}</td></tr>
            <tr><td><strong>Salaires éligibles</strong></td><td>{fmt(c.eligibleSalaries)}</td></tr>
            <tr><td><strong>Crédit CRIC estimé (14%)</strong></td><td><strong style={{ color: "#059669" }}>{fmt(c.cricCredit)}</strong></td></tr>
          </tbody>
        </table>
        <div className="alert">
          Le taux CRIC varie selon la taille de l'entreprise (14% à 30% pour les PME admissibles). Vérifiez avec Revenu Québec.
        </div>
      </div>
    </>
  )
}
