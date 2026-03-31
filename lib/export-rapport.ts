import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow,
  TableCell, WidthType, AlignmentType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, NumberFormat,
} from "docx"
import { saveAs } from "file-saver"

type T661Data = {
  fiscalYear: number
  projectInfo: { name: string; code: string; description?: string }
  hours: {
    total: number; rdDirect: number; rdSupport: number; eligible: number
    byEmployee: { name: string; rdHours: number; suppHours: number; nonHours: number; totalHours: number }[]
  }
  costs: { salaries: number; expenses: number; total: number }
  credits: { federal: number; cric: number; total: number }
  narratives?: { line242?: string; line244?: string; line246?: string }
  hypotheses?: { version: number; title: string; description: string; status: string; pivotReason?: string }[]
}

type CRICData = {
  fiscalYear: number; eligibleSalaries: number; cricCredit: number; province: string
}

function fmt(n: number) {
  return n.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " $"
}

function heading1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1e40af" } },
  })
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  })
}

function body(text: string, bold = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold, size: 22 })],
    spacing: { after: 120 },
  })
}

function labelValue(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label} : `, bold: true, size: 22 }),
      new TextRun({ text: value, size: 22 }),
    ],
    spacing: { after: 100 },
  })
}

function spacer(): Paragraph {
  return new Paragraph({ text: "", spacing: { after: 200 } })
}

function hoursTable(employees: T661Data["hours"]["byEmployee"], totals: T661Data["hours"]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: ["Employé", "R&D directe", "Support R&D", "Non admis.", "Total", "% RS&DE"].map(h =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
        shading: { type: ShadingType.SOLID, color: "1e40af" },
        width: { size: h === "Employé" ? 30 : 14, type: WidthType.PERCENTAGE },
      })
    ),
  })

  const dataRows = employees.map((e, i) => {
    const pct = e.totalHours > 0 ? Math.round(((e.rdHours + e.suppHours * 0.8) / e.totalHours) * 100) : 0
    const bg = i % 2 === 0 ? "f8fafc" : "FFFFFF"
    return new TableRow({
      children: [
        e.name, `${e.rdHours}h`, `${e.suppHours}h`, `${e.nonHours}h`, `${e.totalHours}h`, `${pct}%`
      ].map((val, j) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: val, size: 20, bold: j === 0 })], alignment: j === 0 ? AlignmentType.LEFT : AlignmentType.CENTER })],
          shading: { type: ShadingType.SOLID, color: bg },
        })
      ),
    })
  })

  const non = parseFloat((totals.total - totals.rdDirect - totals.rdSupport).toFixed(2))
  const totalRow = new TableRow({
    children: [
      "TOTAL", `${totals.rdDirect}h`, `${totals.rdSupport}h`, `${non}h`, `${totals.total}h`, ""
    ].map((val, j) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: val, bold: true, size: 20 })], alignment: j === 0 ? AlignmentType.LEFT : AlignmentType.CENTER })],
        shading: { type: ShadingType.SOLID, color: "e2e8f0" },
      })
    ),
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows, totalRow],
  })
}

export async function exportWord(title: string, t661: T661Data, cric: CRICData) {
  const hasNarratives = !!t661.narratives?.line242

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
        heading1: { run: { font: "Calibri", size: 32, bold: true, color: "1e40af" } },
        heading2: { run: { font: "Calibri", size: 26, bold: true, color: "1e3a8a" } },
      },
    },
    sections: [{
      properties: {},
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `RS&DE ${t661.fiscalYear} — ${t661.projectInfo.name}`, bold: true, size: 18, color: "64748b" }),
                new TextRun({ text: "\t\t", size: 18 }),
                new TextRun({ text: "CONFIDENTIEL", size: 18, color: "94a3b8" }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Généré par InnoProject · Page ", size: 18, color: "94a3b8" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "94a3b8" }),
              ],
            }),
          ],
        }),
      },
      children: [
        // Page titre
        new Paragraph({
          children: [new TextRun({ text: "RAPPORT RS&DE", bold: true, size: 48, color: "1e40af" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 1200, after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Formulaire T661 — Année fiscale ${t661.fiscalYear}`, size: 28, color: "334155" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: t661.projectInfo.name, bold: true, size: 32, color: "0f172a" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Code : ${t661.projectInfo.code}`, size: 22, color: "64748b" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Généré le : ${new Date().toLocaleDateString("fr-CA")}`, size: 20, color: "94a3b8" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),

        spacer(), spacer(),

        // 1. Résumé financier
        heading1("1. Résumé financier RS&DE"),
        labelValue("Heures R&D directes", `${t661.hours.rdDirect}h`),
        labelValue("Heures support R&D", `${t661.hours.rdSupport}h`),
        labelValue("Heures éligibles totales", `${t661.hours.eligible}h`),
        spacer(),
        labelValue("Coûts de main-d'œuvre éligibles", fmt(t661.costs.salaries)),
        labelValue("Dépenses éligibles", fmt(t661.costs.expenses)),
        labelValue("Total dépenses éligibles", fmt(t661.costs.total)),
        spacer(),
        new Paragraph({
          children: [new TextRun({ text: `Crédit fédéral estimé (15%) : `, bold: true, size: 24 }), new TextRun({ text: fmt(t661.credits.federal), bold: true, size: 24, color: "7c3aed" })],
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `CRIC Québec estimé (14%) : `, bold: true, size: 24 }), new TextRun({ text: fmt(t661.credits.cric), bold: true, size: 24, color: "059669" })],
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `TOTAL CRÉDITS ESTIMÉS : `, bold: true, size: 28, color: "1e40af" }), new TextRun({ text: fmt(t661.credits.total), bold: true, size: 28, color: "1e40af" })],
          spacing: { after: 200 },
        }),
        body("Note : Ces montants sont des estimations préliminaires. Consultez un comptable spécialisé RS&DE.", false),

        spacer(),

        // 2. Allocation des heures
        heading1("2. Allocation des heures par employé"),
        hoursTable(t661.hours.byEmployee, t661.hours),
        spacer(),

        // 3. Narratifs T661
        heading1("3. Narratifs T661"),

        ...(hasNarratives ? [
          heading2("Ligne 242 — Avancement technologique ou scientifique"),
          new Paragraph({
            children: [new TextRun({ text: t661.narratives?.line242 ?? "", size: 22 })],
            spacing: { after: 300 },
          }),
          heading2("Ligne 244 — Incertitudes technologiques"),
          new Paragraph({
            children: [new TextRun({ text: t661.narratives?.line244 ?? "", size: 22 })],
            spacing: { after: 300 },
          }),
          heading2("Ligne 246 — Travaux effectués"),
          new Paragraph({
            children: [new TextRun({ text: t661.narratives?.line246 ?? "", size: 22 })],
            spacing: { after: 300 },
          }),
        ] : [
          body("Les narratifs n'ont pas encore été générés. Utilisez le bouton 'Générer narratifs T661' dans l'application."),
        ]),

        spacer(),

        // 4. Hypothèses
        ...(t661.hypotheses && t661.hypotheses.length > 0 ? [
          heading1("4. Hypothèses de travail (évolution)"),
          ...t661.hypotheses.flatMap(h => [
            new Paragraph({
              children: [
                new TextRun({ text: `v${h.version} — ${h.title}`, bold: true, size: 22 }),
                new TextRun({ text: `  [${h.status}]`, size: 20, color: h.status === "ACTIVE" ? "059669" : h.status === "ABANDONED" ? "d97706" : "64748b" }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            new Paragraph({ children: [new TextRun({ text: h.description, size: 20 })], spacing: { after: 100 } }),
            ...(h.pivotReason ? [
              new Paragraph({ children: [new TextRun({ text: `Raison du pivot : ${h.pivotReason}`, size: 20, italics: true, color: "d97706" })], spacing: { after: 150 } }),
            ] : []),
          ]),
          spacer(),
        ] : []),

        // 5. CRIC Québec
        heading1("5. CRIC — Crédit d'impôt Québec"),
        labelValue("Province", cric.province),
        labelValue("Année fiscale", String(cric.fiscalYear)),
        labelValue("Salaires éligibles", fmt(cric.eligibleSalaries)),
        new Paragraph({
          children: [new TextRun({ text: `Crédit CRIC estimé : `, bold: true, size: 24 }), new TextRun({ text: fmt(cric.cricCredit), bold: true, size: 24, color: "059669" })],
          spacing: { after: 200 },
        }),
        body("Note : Le taux CRIC varie selon la taille de l'entreprise (14% à 30% pour les PME admissibles). Vérifiez avec Revenu Québec."),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `RS&DE-${t661.fiscalYear}-${t661.projectInfo.code}.docx`)
}

export async function exportPDF(reportId: string) {
  window.open(`/rapports/${reportId}/print`, "_blank")
}
