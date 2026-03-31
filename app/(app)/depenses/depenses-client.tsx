"use client"
import { useThemeColors } from "@/hooks/use-theme-colors"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle, CheckCircle2, XCircle, Plus, Pencil, Trash2,
  DollarSign, TrendingUp, TrendingDown, Filter, Info, Save,
  BarChart3, List, Settings2, Clock, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp, CalendarDays, LineChart,
  Upload, Sparkles, Download, RefreshCw, Calendar, Target,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Line, ComposedChart, Area,
} from "recharts"

// ─── Types ───────────────────────────────────────────────────────────────────
type Project    = { id: string; name: string; code: string; members: { user: { id: string; name: string; email: string } }[] }
type Expense    = {
  id: string; description: string; amount: number; date: string
  category: string; supplier: string | null; invoiceRef: string | null
  srdeEligibility: string; srdePercentage: number | null; notes: string | null
  status: string
  project: { id: string; name: string; code: string }
  approval?: {
    reason: string; comment: string | null; budgetBefore: number; budgetTotal: number
    requestedBy: { id: string; name: string }
    approver?: { id: string; name: string } | null
  } | null
}
type BudgetLine = { id: string; projectId: string; category: string; planned: number; description: string | null; fiscalYear: number; distributionMode: string }

type IASuggestion = {
  montant: number
  justification: string
  variation: string
  admissibilite: string
}
type IAResult = {
  suggestions: Record<string, IASuggestion>
  totalSuggere: number
  totalRDEligible: number
  commentaireGlobal: string
  alertes: string[]
}

// ─── Constantes ──────────────────────────────────────────────────────────────
const CATEGORIES: Record<string, string> = {
  SALARY:      "Salaires",
  MATERIALS:   "Matériaux et fournitures",
  SUBCONTRACT: "Sous-traitance",
  EQUIPMENT:   "Équipement",
  OVERHEAD:    "Frais généraux",
  OTHER:       "Autres",
}

const CAT_COLORS: Record<string, string> = {
  SALARY:      "bg-blue-100 text-blue-700 border-blue-200",
  MATERIALS:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  SUBCONTRACT: "bg-violet-100 text-violet-700 border-violet-200",
  EQUIPMENT:   "bg-amber-100 text-amber-700 border-amber-200",
  OVERHEAD:    "bg-slate-100 text-slate-600 border-slate-200",
  OTHER:       "bg-pink-100 text-pink-700 border-pink-200",
}

const SRDE_CONFIG = {
  ELIGIBLE:     { label: "Admissible (100%)",         icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  PARTIAL:      { label: "Partiellement admissible",  icon: AlertTriangle, color: "text-amber-600 bg-amber-50 border-amber-200" },
  NOT_ELIGIBLE: { label: "Non admissible",             icon: XCircle,      color: "text-red-600 bg-red-50 border-red-200" },
}

const SRDE_HELP: Record<string, string> = {
  SALARY:      "Les salaires des employés travaillant directement sur des activités RS&DE sont généralement admissibles à 100%.",
  MATERIALS:   "Matériaux consommés ou transformés dans les expériences RS&DE sont admissibles. Les matériaux réutilisables peuvent être partiels.",
  SUBCONTRACT: "Contrats de sous-traitance RS&DE avec des entités canadiennes : 80% admissibles. Avec étrangers : peut varier.",
  EQUIPMENT:   "L'équipement utilisé à la fois pour RS&DE et autres fins est admissible selon le % d'utilisation RS&DE.",
  OVERHEAD:    "Les frais généraux liés aux activités RS&DE peuvent être admissibles selon la méthode de calcul choisie.",
  OTHER:       "Évaluez au cas par cas avec votre comptable RS&DE.",
}

const EMPTY_FORM = {
  projectId: "", description: "", amount: "", date: new Date().toISOString().split("T")[0],
  category: "MATERIALS", supplier: "", invoiceRef: "", srdeEligibility: "ELIGIBLE",
  srdePercentage: "100", notes: "",
}

const BAR_COLORS = ["#1e40af", "#7c3aed", "#059669", "#d97706", "#dc2626", "#64748b"]

const CAN_APPROVE = ["ADMIN", "PROJECT_MANAGER"]

interface Props {
  projects: Project[]
  expenses: Expense[]
  budgetLines: BudgetLine[]
  currentUserRole: string
}

// ─── Approval step state ──────────────────────────────────────────────────────
interface ApprovalStepData {
  budgetBefore: number
  budgetTotal: number
  pendingForm: typeof EMPTY_FORM
}

export function DepensesClient({ projects, expenses: initExp, budgetLines: initBudget, currentUserRole }: Props) {
  const dark = useThemeColors()
  const router = useRouter()
  const [viewMode, setViewMode]       = useState<"futuriste" | "classique">("futuriste")

  // Lire préférence sauvegardée
  useEffect(() => {
    const saved = localStorage.getItem("depenses-view-mode")
    if (saved === "classique" || saved === "futuriste") setViewMode(saved)
  }, [])

  const [expenses, setExpenses]       = useState<Expense[]>(initExp)
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>(initBudget)
  const [selectedProject, setSelectedProject] = useState(projects[0]?.id ?? "all")
  const [showForm, setShowForm]       = useState(false)
  const [editTarget, setEditTarget]   = useState<Expense | null>(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState("")
  const [budgetAlert, setBudgetAlert] = useState<string | null>(null)
  const [filterCat, setFilterCat]     = useState("all")

  // Approval step (step 2 of form)
  const [approvalStep, setApprovalStep]   = useState<ApprovalStepData | null>(null)
  const [approvalReason, setApprovalReason] = useState("")

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<Expense | null>(null)
  const [rejectComment, setRejectComment] = useState("")
  const [rejectLoading, setRejectLoading] = useState(false)

  // Months expanded state (all expanded by default)
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  // Budget editing
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetForm, setBudgetForm]   = useState<Record<string, string>>({})
  const [savingBudget, setSavingBudget] = useState(false)

  // Fiscal year & distribution
  const [fiscalYear, setFiscalYear] = useState<number>(new Date().getFullYear())
  const [distributionMode, setDistributionMode] = useState<"MONTHLY" | "WEEKLY">("MONTHLY")

  // IA budget preparation
  const [iaLoading, setIaLoading] = useState(false)
  const [iaResult, setIaResult] = useState<IAResult | null>(null)
  const [iaError, setIaError] = useState("")
  const [iaApplying, setIaApplying] = useState(false)

  // CSV import
  const [csvError, setCsvError] = useState("")

  const setF = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }))

  // ── Données filtrées ──────────────────────────────────────────────────────
  const projExpenses = useMemo(() =>
    expenses.filter(e =>
      (selectedProject === "all" || e.project.id === selectedProject) &&
      (filterCat === "all" || e.category === filterCat)
    ), [expenses, selectedProject, filterCat])

  const projBudget = useMemo(() =>
    budgetLines.filter(b =>
      (selectedProject === "all" || b.projectId === selectedProject) &&
      b.fiscalYear === fiscalYear
    ),
    [budgetLines, selectedProject, fiscalYear])

  // Only APPROVED expenses count toward budget
  const approvedExpenses = useMemo(() =>
    projExpenses.filter(e => !e.status || e.status === "APPROVED"),
    [projExpenses])

  const pendingExpenses = useMemo(() =>
    expenses.filter(e => e.status === "PENDING"),
    [expenses])

  // ── Totaux (APPROVED only) ────────────────────────────────────────────────
  const totalSpent  = approvedExpenses.reduce((s, e) => s + e.amount, 0)
  const totalBudget = projBudget.reduce((s, b) => s + b.planned, 0)
  const budgetPct   = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const rdEligible  = approvedExpenses.reduce((s, e) => {
    if (e.srdeEligibility === "NOT_ELIGIBLE") return s
    const pct = e.srdeEligibility === "PARTIAL" ? (e.srdePercentage ?? 50) / 100 : 1
    return s + e.amount * pct
  }, 0)

  // ── Par catégorie (APPROVED only) ─────────────────────────────────────────
  const byCategory = useMemo(() => {
    const map: Record<string, { spent: number; budget: number }> = {}
    Object.keys(CATEGORIES).forEach(cat => { map[cat] = { spent: 0, budget: 0 } })
    approvedExpenses.forEach(e => { map[e.category].spent += e.amount })
    projBudget.forEach(b => { map[b.category].budget += b.planned })
    return map
  }, [approvedExpenses, projBudget])

  // ── Répartition mensuelle (APPROVED only) ─────────────────────────────────
  const monthlyData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    approvedExpenses.forEach(e => {
      const month = e.date.slice(0, 7)
      if (!map[month]) map[month] = {}
      map[month][e.category] = (map[month][e.category] ?? 0) + e.amount
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, cats]) => ({ month, ...cats, total: Object.values(cats).reduce((s, v) => s + v, 0) }))
  }, [approvedExpenses])

  // ── Dépenses groupées par mois ─────────────────────────────────────────────
  const expensesByMonth = useMemo(() => {
    const map: Record<string, Expense[]> = {}
    projExpenses.forEach(e => {
      const month = e.date.slice(0, 7)
      if (!map[month]) map[month] = []
      map[month].push(e)
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)) // plus récent en premier
  }, [projExpenses])

  // ── Cumul mensuel (pour chart progression budget) ──────────────────────────
  const cumulativeData = useMemo(() => {
    let running = 0
    return monthlyData.map(row => {
      running += row.total
      return { ...row, cumul: running }
    })
  }, [monthlyData])

  // ── Alerte budget ─────────────────────────────────────────────────────────
  const alertLevel = budgetPct >= 100 ? "exceeded" : budgetPct >= 90 ? "warning" : null

  // ── CRUD Dépenses ─────────────────────────────────────────────────────────
  function openNew() {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM, projectId: selectedProject !== "all" ? selectedProject : "" })
    setApprovalStep(null)
    setApprovalReason("")
    setError("")
    setShowForm(true)
  }

  function openEdit(exp: Expense) {
    setEditTarget(exp)
    setForm({
      projectId: exp.project.id, description: exp.description,
      amount: String(exp.amount), date: exp.date.slice(0, 10),
      category: exp.category, supplier: exp.supplier ?? "",
      invoiceRef: exp.invoiceRef ?? "",
      srdeEligibility: exp.srdeEligibility,
      srdePercentage: String(exp.srdePercentage ?? 100),
      notes: exp.notes ?? "",
    })
    setApprovalStep(null)
    setApprovalReason("")
    setError("")
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditTarget(null)
    setApprovalStep(null)
    setApprovalReason("")
    setError("")
  }

  async function handleSave() {
    if (!form.projectId || !form.description || !form.amount || !form.date || !form.category) {
      setError("Champs requis manquants."); return
    }
    setLoading(true); setError("")

    if (editTarget) {
      const res = await fetch(`/api/depenses/${editTarget.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      if (!res.ok) { setError((await res.json()).error ?? "Erreur"); setLoading(false); return }
      const updated = await res.json()
      setExpenses(p => p.map(e => e.id === editTarget.id ? { ...e, ...updated } : e))
      setLoading(false)
      closeForm()
      router.refresh()
    } else {
      const res = await fetch("/api/depenses", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Erreur"); setLoading(false); return
      }

      // API signals that approval is required — show step 2
      if (data.requiresApproval) {
        setApprovalStep({
          budgetBefore: data.budgetBefore ?? 0,
          budgetTotal: data.budgetTotal ?? 0,
          pendingForm: { ...form },
        })
        setLoading(false)
        return
      }

      const { expense, budgetAlert: alert } = data
      setExpenses(p => [expense, ...p])
      if (alert) setBudgetAlert(alert)
      setLoading(false)
      closeForm()
      router.refresh()
    }
  }

  async function handleSubmitWithApproval() {
    if (!approvalReason.trim()) {
      setError("Une justification est requise."); return
    }
    setLoading(true); setError("")

    const res = await fetch("/api/depenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...approvalStep!.pendingForm, approvalReason }),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? "Erreur"); setLoading(false); return }

    const { expense, budgetAlert: alert } = data
    setExpenses(p => [expense, ...p])
    if (alert) setBudgetAlert(alert)
    setLoading(false)
    closeForm()
    router.refresh()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/depenses/${id}`, { method: "DELETE" })
    setExpenses(p => p.filter(e => e.id !== id))
  }

  // ── Approbation ───────────────────────────────────────────────────────────
  async function handleApprove(expenseId: string) {
    const res = await fetch(`/api/depenses/${expenseId}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVE" }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setExpenses(p => p.map(e => e.id === expenseId ? { ...e, ...updated } : e))
    router.refresh()
  }

  async function handleReject() {
    if (!rejectTarget) return
    setRejectLoading(true)
    const res = await fetch(`/api/depenses/${rejectTarget.id}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REJECT", comment: rejectComment }),
    })
    if (res.ok) {
      const updated = await res.json()
      setExpenses(p => p.map(e => e.id === rejectTarget.id ? { ...e, ...updated } : e))
      router.refresh()
    }
    setRejectTarget(null)
    setRejectComment("")
    setRejectLoading(false)
  }

  // ── Budget ────────────────────────────────────────────────────────────────
  function startEditBudget() {
    const init: Record<string, string> = {}
    projBudget.forEach(b => { init[b.category] = String(b.planned) })
    setBudgetForm(init); setEditingBudget(true)
  }

  async function saveBudget() {
    setSavingBudget(true)
    const pid = selectedProject !== "all" ? selectedProject : projects[0]?.id
    if (!pid) { setSavingBudget(false); return }

    const promises = Object.entries(budgetForm)
      .filter(([, v]) => v && parseFloat(v) >= 0)
      .map(([category, planned]) =>
        fetch("/api/budget", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: pid, category, planned, fiscalYear, distributionMode }),
        })
      )
    await Promise.all(promises)

    const res = await fetch(`/api/budget?projectId=${pid}&fiscalYear=${fiscalYear}`)
    if (res.ok) {
      const newLines = await res.json()
      setBudgetLines(p => [...p.filter(b => !(b.projectId === pid && b.fiscalYear === fiscalYear)), ...newLines])
    }
    setEditingBudget(false); setSavingBudget(false)
  }

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    setCsvError("")
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split("\n").filter(l => l.trim())
      const newForm: Record<string, string> = {}
      const CAT_MAP: Record<string, string> = {
        "salaires": "SALARY", "salary": "SALARY",
        "matériaux": "MATERIALS", "materials": "MATERIALS", "materiaux": "MATERIALS",
        "sous-traitance": "SUBCONTRACT", "subcontract": "SUBCONTRACT",
        "équipement": "EQUIPMENT", "equipment": "EQUIPMENT", "equipement": "EQUIPMENT",
        "frais généraux": "OVERHEAD", "overhead": "OVERHEAD", "frais generaux": "OVERHEAD",
        "autres": "OTHER", "other": "OTHER",
      }
      let ok = 0
      for (const line of lines) {
        const parts = line.split(/[;,]/).map(s => s.trim().replace(/^["']|["']$/g, ""))
        if (parts.length < 2) continue
        const catKey = parts[0].toLowerCase()
        const amount = parseFloat(parts[1].replace(/\s/g, "").replace(",", "."))
        const cat = CAT_MAP[catKey]
        if (cat && !isNaN(amount)) { newForm[cat] = String(amount); ok++ }
      }
      if (ok === 0) { setCsvError("Format non reconnu. Utilisez : Catégorie;Montant par ligne."); return }
      setBudgetForm(p => ({ ...p, ...newForm }))
      setEditingBudget(true)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleApplyIASuggestions() {
    if (!iaResult) return
    const pid = selectedProject !== "all" ? selectedProject : projects[0]?.id
    if (!pid) return
    setIaApplying(true)
    const targetYear = fiscalYear + 1
    const promises = Object.entries(iaResult.suggestions)
      .filter(([, s]) => s.montant > 0)
      .map(([category, s]) =>
        fetch("/api/budget", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: pid, category, planned: s.montant, fiscalYear: targetYear, distributionMode }),
        })
      )
    await Promise.all(promises)
    const res = await fetch(`/api/budget?projectId=${pid}&fiscalYear=${targetYear}`)
    if (res.ok) {
      const newLines = await res.json()
      setBudgetLines(p => [...p.filter(b => !(b.projectId === pid && b.fiscalYear === targetYear)), ...newLines])
    }
    setFiscalYear(targetYear)
    setIaResult(null)
    setIaApplying(false)
  }

  async function handleGenerateIA() {
    const pid = selectedProject !== "all" ? selectedProject : projects[0]?.id
    if (!pid) { setIaError("Sélectionnez un projet."); return }
    setIaLoading(true); setIaError(""); setIaResult(null)
    const res = await fetch("/api/budget/preparer", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: pid, targetYear: fiscalYear + 1 }),
    })
    const data = await res.json()
    if (!res.ok) { setIaError(data.error ?? "Erreur IA"); setIaLoading(false); return }
    setIaResult(data)
    setIaLoading(false)
  }

  const fmt = (n: number) => n.toLocaleString("fr-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " $"

  const canApprove = CAN_APPROVE.includes(currentUserRole)

  // ── Neon color helpers ────────────────────────────────────────────────────
  const CAT_HEX: Record<string, string> = {
    SALARY:      "#3b82f6",
    MATERIALS:   "#10b981",
    SUBCONTRACT: "#8b5cf6",
    EQUIPMENT:   "#f59e0b",
    OVERHEAD:    "#64748b",
    OTHER:       "#ec4899",
  }

  const consumedColor = budgetPct >= 100 ? "#ef4444" : budgetPct >= 90 ? "#f59e0b" : "#10b981"

  if (viewMode === "classique") return (
    <ClassiqueDepenses
      viewMode={viewMode} setViewMode={setViewMode}
      projects={projects} expenses={projExpenses} approvedExpenses={approvedExpenses}
      pendingExpenses={pendingExpenses} expensesByMonth={expensesByMonth}
      byCategory={byCategory} monthlyData={monthlyData} cumulativeData={cumulativeData}
      totalSpent={totalSpent} totalBudget={totalBudget} budgetPct={budgetPct}
      rdEligible={rdEligible} alertLevel={alertLevel} budgetAlert={budgetAlert}
      setBudgetAlert={setBudgetAlert} filterCat={filterCat} setFilterCat={setFilterCat}
      collapsedMonths={collapsedMonths} setCollapsedMonths={setCollapsedMonths}
      editingBudget={editingBudget} budgetForm={budgetForm} setBudgetForm={setBudgetForm}
      savingBudget={savingBudget} canApprove={canApprove}
      selectedProject={selectedProject} setSelectedProject={setSelectedProject}
      openNew={openNew} openEdit={openEdit} handleDelete={handleDelete}
      handleApprove={handleApprove} setRejectTarget={setRejectTarget}
      fmt={fmt}
    />
  )

  return (
    <div
      className="p-6 space-y-6"
      style={{
        background: dark.bg,
        backgroundImage: dark.isDark ? "linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)" : "none",
        backgroundSize: "40px 40px",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: dark.text, fontSize: 28, fontWeight: 900, textShadow: "0 0 30px rgba(6,182,212,0.5)", margin: 0 }}>DÉPENSES</h1>
          <p style={{ color: dark.sub, fontSize: 13, marginTop: 2 }}>Suivi budgétaire et admissibilité RS&DE</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => { const n = viewMode === "futuriste" ? "classique" : "futuriste"; setViewMode(n); localStorage.setItem("depenses-view-mode", n) }}
            style={{ background: viewMode === "futuriste" ? "rgba(6,182,212,0.1)" : "rgba(99,102,241,0.1)", border: `1px solid ${viewMode === "futuriste" ? "rgba(6,182,212,0.3)" : "rgba(99,102,241,0.3)"}`, color: viewMode === "futuriste" ? "#06b6d4" : "#6366f1", borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            {viewMode === "futuriste" ? "☀️ Vue classique" : "🌙 Vue futuriste"}
          </button>
          <Button
            onClick={openNew}
            style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)", border: "none", color: "white", boxShadow: "0 4px 15px rgba(6,182,212,0.4)" }}
          >
            <Plus className="h-4 w-4 mr-1.5" />Nouvelle dépense
          </Button>
        </div>
      </div>

      {/* Sélecteur projet */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedProject} onValueChange={v => { setSelectedProject(v); setBudgetAlert(null) }}>
          <SelectTrigger
            className="w-[240px]"
            style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }}
          >
            <SelectValue placeholder="Tous les projets" />
          </SelectTrigger>
          <SelectContent style={{ background: dark.panel, border: "1px solid rgba(6,182,212,0.2)", color: dark.text }}>
            <SelectItem value="all">Tous les projets</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Alerte budget */}
      {(alertLevel || budgetAlert) && (
        <div
          style={{
            display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
            borderRadius: 12,
            background: (alertLevel ?? budgetAlert) === "exceeded" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
            border: (alertLevel ?? budgetAlert) === "exceeded" ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(245,158,11,0.4)",
          }}
        >
          <AlertTriangle
            className="h-5 w-5 shrink-0 mt-0.5"
            style={{ color: (alertLevel ?? budgetAlert) === "exceeded" ? "#ef4444" : "#f59e0b" }}
          />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: (alertLevel ?? budgetAlert) === "exceeded" ? "#fca5a5" : "#fcd34d" }}>
              {(alertLevel ?? budgetAlert) === "exceeded" ? "Budget dépassé !" : "Attention — 90% du budget atteint"}
            </p>
            <p style={{ fontSize: 13, marginTop: 2, color: (alertLevel ?? budgetAlert) === "exceeded" ? "#fca5a5" : "#fcd34d", opacity: 0.85 }}>
              {(alertLevel ?? budgetAlert) === "exceeded"
                ? `Les dépenses (${fmt(totalSpent)}) dépassent le budget prévu (${fmt(totalBudget)}). Contactez le responsable du projet.`
                : `${Math.round(budgetPct)}% du budget consommé (${fmt(totalSpent)} / ${fmt(totalBudget)}). Avisez le responsable de projet.`
              }
            </p>
          </div>
          <button style={{ marginLeft: "auto", color: dark.sub, background: "none", border: "none", cursor: "pointer" }} onClick={() => setBudgetAlert(null)}>✕</button>
        </div>
      )}

      {/* Stats KPI 4 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total approuvé */}
        <div style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 16, padding: "20px" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="h-3.5 w-3.5" style={{ color: "#06b6d4" }} />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Total approuvé</p>
          </div>
          <p style={{ color: "#06b6d4", fontSize: 28, fontWeight: 900, textShadow: "0 0 20px #06b6d480", margin: 0 }}>{fmt(totalSpent)}</p>
        </div>

        {/* Budget prévu */}
        <div style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 16, padding: "20px" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 className="h-3.5 w-3.5" style={{ color: "#8b5cf6" }} />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Budget prévu</p>
          </div>
          <p style={{ color: "#8b5cf6", fontSize: 28, fontWeight: 900, textShadow: "0 0 20px #8b5cf680", margin: 0 }}>{totalBudget > 0 ? fmt(totalBudget) : "—"}</p>
        </div>

        {/* Consommé */}
        <div style={{ background: `${consumedColor}0d`, border: `1px solid ${consumedColor}33`, borderRadius: 16, padding: "20px" }}>
          <div className="flex items-center gap-1.5 mb-2">
            {budgetPct <= 100
              ? <TrendingUp className="h-3.5 w-3.5" style={{ color: consumedColor }} />
              : <TrendingDown className="h-3.5 w-3.5" style={{ color: consumedColor }} />
            }
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Consommé</p>
          </div>
          <p style={{ color: consumedColor, fontSize: 28, fontWeight: 900, textShadow: `0 0 20px ${consumedColor}80`, margin: 0 }}>
            {totalBudget > 0 ? `${Math.round(budgetPct)}%` : "—"}
          </p>
          {totalBudget > 0 && (
            <div style={{ marginTop: 8, height: 4, background: dark.border, borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4,
                width: `${Math.min(budgetPct, 100)}%`,
                background: budgetPct >= 100
                  ? "linear-gradient(90deg, #ef4444, #f97316)"
                  : budgetPct >= 90
                  ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                  : "linear-gradient(90deg, #10b981, #06b6d4)",
                boxShadow: budgetPct >= 100 ? "0 0 8px #ef444460" : "0 0 8px #10b98160",
              }} />
            </div>
          )}
        </div>

        {/* Admissible RS&DE */}
        <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 16, padding: "20px" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#10b981" }} />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Admissible RS&DE</p>
          </div>
          <p style={{ color: "#10b981", fontSize: 28, fontWeight: 900, textShadow: "0 0 20px #10b98180", margin: 0 }}>{fmt(rdEligible)}</p>
          <p className="text-xs text-slate-400 mt-1">
            {totalSpent > 0 ? `${Math.round((rdEligible / totalSpent) * 100)}% du total` : ""}
          </p>
        </div>
      </div>

      <Tabs defaultValue="depenses">
        <TabsList style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
          <TabsTrigger value="depenses" style={{ color: dark.sub }}>
            <CalendarDays className="h-3.5 w-3.5 mr-1.5" />Dépenses par mois ({projExpenses.length})
          </TabsTrigger>
          <TabsTrigger value="budget" style={{ color: dark.sub }}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />Budget par catégorie
          </TabsTrigger>
          <TabsTrigger value="mensuel" style={{ color: dark.sub }}>
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />Répartition mensuelle
          </TabsTrigger>
          <TabsTrigger value="preparer" style={{ color: dark.sub }}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />Préparer Budget IA
          </TabsTrigger>
          {canApprove && (
            <TabsTrigger value="approbations" className="relative" style={{ color: dark.sub }}>
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Approbations
              {pendingExpenses.length > 0 && (
                <span style={{ marginLeft: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", height: 16, width: 16, borderRadius: "50%", background: "#f97316", color: dark.text, fontSize: 10, fontWeight: 700 }}>
                  {pendingExpenses.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Onglet Dépenses (groupées par mois) ── */}
        <TabsContent value="depenses" className="mt-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 shrink-0" style={{ color: dark.sub }} />
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger
                className="w-[200px]"
                style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }}
              >
                <SelectValue placeholder="Toutes catégories" />
              </SelectTrigger>
              <SelectContent style={{ background: dark.panel, border: "1px solid rgba(6,182,212,0.2)", color: dark.text }}>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {expensesByMonth.length === 0 ? (
            <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 16, padding: "40px 20px", textAlign: "center" }}>
              <p className="text-sm text-slate-400">Aucune dépense enregistrée.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expensesByMonth.map(([month, monthExpenses]) => {
                const isCollapsed = collapsedMonths.has(month)
                const monthTotal  = monthExpenses.reduce((s, e) => s + (e.status !== "REJECTED" ? e.amount : 0), 0)
                const monthApproved = monthExpenses.filter(e => e.status === "APPROVED").reduce((s, e) => s + e.amount, 0)
                const hasPending  = monthExpenses.some(e => e.status === "PENDING")
                const [year, mo]  = month.split("-")
                const monthLabel  = new Date(parseInt(year), parseInt(mo) - 1, 1)
                  .toLocaleDateString("fr-CA", { month: "long", year: "numeric" })

                return (
                  <div
                    key={month}
                    style={{
                      background: dark.card,
                      border: hasPending ? "1px solid rgba(249,115,22,0.4)" : "1px solid rgba(6,182,212,0.2)",
                      borderRadius: 16,
                      overflow: "hidden",
                      borderLeft: hasPending ? "3px solid #f97316" : "3px solid #06b6d4",
                    }}
                  >
                    {/* Month header — clickable to collapse */}
                    <button
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors"
                      style={{ background: "transparent", border: "none", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.background = dark.hover)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      onClick={() => setCollapsedMonths(prev => {
                        const next = new Set(prev)
                        next.has(month) ? next.delete(month) : next.add(month)
                        return next
                      })}
                    >
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-4 w-4 shrink-0" style={{ color: hasPending ? "#f97316" : "#06b6d4" }} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: dark.text, textTransform: "capitalize" }}>{monthLabel}</span>
                        <span className="text-xs text-slate-400">{monthExpenses.length} dépense{monthExpenses.length > 1 ? "s" : ""}</span>
                        {hasPending && (
                          <span style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.4)", color: "#f97316", fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "1px 8px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Clock className="h-2.5 w-2.5" />En attente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#06b6d4" }}>{fmt(monthApproved)}</span>
                          {monthApproved !== monthTotal && (
                            <span className="text-xs text-slate-400 ml-1.5">({fmt(monthTotal)} incl. attente)</span>
                          )}
                        </div>
                        {isCollapsed
                          ? <ChevronDown className="h-4 w-4 text-slate-400" />
                          : <ChevronUp className="h-4 w-4 text-slate-400" />
                        }
                      </div>
                    </button>

                    {/* Expense rows */}
                    {!isCollapsed && (
                      <div style={{ borderTop: `1px solid ${dark.border}` }}>
                        {monthExpenses.map(exp => {
                          const srdeCfg  = SRDE_CONFIG[exp.srdeEligibility as keyof typeof SRDE_CONFIG]
                          const SrdeIcon = srdeCfg.icon
                          const isPending  = exp.status === "PENDING"
                          const isRejected = exp.status === "REJECTED"
                          const catHex = CAT_HEX[exp.category] ?? "#64748b"

                          return (
                            <div
                              key={exp.id}
                              className="flex items-start gap-3 px-5 py-3 transition-colors group"
                              style={{ borderBottom: `1px solid ${dark.border}`, opacity: isRejected ? 0.5 : 1, background: "transparent" }}
                              onMouseEnter={e => (e.currentTarget.style.background = dark.hover)}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span style={{ fontSize: 13, fontWeight: 600, color: isRejected ? "#64748b" : "white", textDecoration: isRejected ? "line-through" : "none" }}>
                                    {exp.description}
                                  </span>
                                  {/* Category badge — dark version */}
                                  <span style={{ background: catHex + "20", color: catHex, border: "1px solid " + catHex + "40", fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "1px 8px" }}>
                                    {CATEGORIES[exp.category]}
                                  </span>
                                  {/* SRDE badge */}
                                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${srdeCfg.color}`}>
                                    <SrdeIcon className="h-3 w-3" />
                                    {exp.srdeEligibility === "PARTIAL" ? `Partiel ${exp.srdePercentage ?? 50}%` : srdeCfg.label}
                                  </span>
                                  <span className="text-xs text-slate-400">{exp.project.code}</span>
                                  {isPending && (
                                    <span style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.4)", color: "#f97316", fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "1px 8px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                      <Clock className="h-2.5 w-2.5" />En attente
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "1px 8px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                      <XCircle className="h-2.5 w-2.5" />Rejetée
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
                                  <span>{new Date(exp.date).toLocaleDateString("fr-CA")}</span>
                                  {exp.supplier && <span>Fournisseur : {exp.supplier}</span>}
                                  {exp.invoiceRef && <span>Réf : {exp.invoiceRef}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span style={{ fontSize: 13, fontWeight: 700, color: isRejected ? "#64748b" : "#06b6d4", textDecoration: isRejected ? "line-through" : "none" }}>
                                  {fmt(exp.amount)}
                                </span>
                                {!isPending && !isRejected && (
                                  <>
                                    <button
                                      onClick={() => openEdit(exp)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                                      style={{ color: dark.sub, background: "none", border: "none", cursor: "pointer" }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(exp.id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                                      style={{ color: dark.sub, background: "none", border: "none", cursor: "pointer" }}
                                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#ef4444")}
                                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#64748b")}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Onglet Budget ── */}
        <TabsContent value="budget" className="mt-4 space-y-4">

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3 justify-between">
            {/* Fiscal year selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar className="h-4 w-4" style={{ color: "#06b6d4" }} />
              <span style={{ fontSize: 13, color: dark.sub, fontWeight: 600 }}>Année fiscale :</span>
              <button
                onClick={() => setFiscalYear(y => y - 1)}
                style={{ background: dark.hover, border: `1px solid ${dark.border}`, color: dark.text, borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 14 }}
              >‹</button>
              <span style={{ fontSize: 16, fontWeight: 900, color: dark.text, minWidth: 50, textAlign: "center" }}>{fiscalYear}</span>
              <button
                onClick={() => setFiscalYear(y => y + 1)}
                style={{ background: dark.hover, border: `1px solid ${dark.border}`, color: dark.text, borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 14 }}
              >›</button>
            </div>

            {/* Distribution mode */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: dark.sub, fontWeight: 600 }}>Répartition :</span>
              {(["MONTHLY", "WEEKLY"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setDistributionMode(m)}
                  style={{
                    background: distributionMode === m ? "rgba(6,182,212,0.2)" : dark.hover,
                    border: distributionMode === m ? "1px solid rgba(6,182,212,0.5)" : "1px solid rgba(255,255,255,0.1)",
                    color: distributionMode === m ? "#06b6d4" : "#64748b",
                    borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >{m === "MONTHLY" ? "Mensuelle" : "Hebdomadaire"}</button>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* CSV import */}
              <label
                style={{ background: dark.hover, border: `1px solid ${dark.border}`, color: dark.text, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Upload className="h-3.5 w-3.5" />Importer CSV
                <input type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvImport} />
              </label>

              {!editingBudget ? (
                <Button size="sm" onClick={startEditBudget}
                  style={{ background: dark.hover, border: `1px solid ${dark.border}`, color: dark.text }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />Modifier
                </Button>
              ) : (
                <Button size="sm" onClick={saveBudget} disabled={savingBudget}
                  style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)", border: "none", color: "white", boxShadow: "0 4px 15px rgba(6,182,212,0.4)" }}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />{savingBudget ? "Enregistrement…" : "Enregistrer"}
                </Button>
              )}
            </div>
          </div>

          {csvError && (
            <p style={{ fontSize: 12, color: "#ef4444", padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8 }}>
              {csvError}
            </p>
          )}

          {/* Format CSV hint */}
          {editingBudget && (
            <div style={{ padding: "10px 14px", background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 10 }}>
              <p style={{ fontSize: 11, color: dark.sub }}>
                <strong style={{ color: "#06b6d4" }}>Format CSV accepté :</strong> une ligne par catégorie — <code style={{ color: dark.sub }}>Catégorie;Montant annuel</code><br />
                Ex: <code style={{ color: dark.sub }}>Salaires;120000</code> · <code style={{ color: dark.sub }}>Matériaux;45000</code> · <code style={{ color: dark.sub }}>Équipement;30000</code>
              </p>
            </div>
          )}

          {/* Summary cards */}
          {totalBudget > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 11, color: dark.sub, fontWeight: 600, marginBottom: 4 }}>BUDGET ANNUEL {fiscalYear}</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: "#8b5cf6" }}>{fmt(totalBudget)}</p>
              </div>
              <div style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 11, color: dark.sub, fontWeight: 600, marginBottom: 4 }}>
                  BUDGET {distributionMode === "MONTHLY" ? "MENSUEL" : "HEBDOMADAIRE"}
                </p>
                <p style={{ fontSize: 20, fontWeight: 900, color: "#06b6d4" }}>
                  {fmt(distributionMode === "MONTHLY" ? totalBudget / 12 : totalBudget / 52)}
                </p>
              </div>
              <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 11, color: dark.sub, fontWeight: 600, marginBottom: 4 }}>RESTANT ANNUEL</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: budgetPct >= 100 ? "#ef4444" : "#10b981" }}>
                  {fmt(Math.max(totalBudget - totalSpent, 0))}
                </p>
              </div>
            </div>
          )}

          {/* Category lines */}
          <div className="space-y-3">
            {Object.entries(CATEGORIES).map(([cat, label]) => {
              const data   = byCategory[cat]
              const budget = editingBudget ? parseFloat(budgetForm[cat] || "0") : data.budget
              const periodBudget = budget > 0 ? (distributionMode === "MONTHLY" ? budget / 12 : budget / 52) : 0
              const pct    = budget > 0 ? Math.min((data.spent / budget) * 100, 100) : 0
              const over   = budget > 0 && data.spent > budget
              const catHex = CAT_HEX[cat] ?? "#64748b"

              return (
                <div key={cat} style={{ background: dark.card, border: over ? "1px solid rgba(239,68,68,0.4)" : `1px solid ${dark.border}`, borderRadius: 16, padding: 16 }}>
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span style={{ background: catHex + "20", color: catHex, border: "1px solid " + catHex + "40", fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "2px 10px" }}>
                        {label}
                      </span>
                      {over && (
                        <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                          <AlertTriangle className="h-3 w-3" />Dépassement
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm shrink-0">
                      <span style={{ fontWeight: 700, color: over ? "#ef4444" : "white" }}>{fmt(data.spent)}</span>
                      <span className="text-slate-400">/</span>
                      {editingBudget ? (
                        <Input type="number" step="100" min="0" className="w-28 h-7 text-xs"
                          style={{ background: dark.hover, border: `1px solid ${dark.border}`, color: dark.text }}
                          placeholder="0"
                          value={budgetForm[cat] ?? ""}
                          onChange={e => setBudgetForm(p => ({ ...p, [cat]: e.target.value }))}
                        />
                      ) : (
                        <span className="text-slate-400">{budget > 0 ? fmt(budget) : "—"}</span>
                      )}
                    </div>
                  </div>
                  {budget > 0 && !editingBudget && (
                    <>
                      <div style={{ height: 6, background: dark.hover, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 4, width: `${pct}%`, background: over ? "linear-gradient(90deg, #ef4444, #f97316)" : pct >= 90 ? "linear-gradient(90deg, #f59e0b, #ef4444)" : "linear-gradient(90deg, #10b981, #06b6d4)", boxShadow: over ? "0 0 8px #ef444460" : "0 0 8px #10b98160" }} />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <p style={{ fontSize: 11, color: dark.sub }}>{Math.round(pct)}% consommé · Restant : {fmt(Math.max(budget - data.spent, 0))}</p>
                        {periodBudget > 0 && (
                          <p style={{ fontSize: 11, color: dark.sub }}>
                            {distributionMode === "MONTHLY" ? "Mensuel" : "Hebdo"} : <span style={{ color: "#06b6d4", fontWeight: 700 }}>{fmt(periodBudget)}</span>
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* ── Onglet Mensuel ── */}
        <TabsContent value="mensuel" className="mt-4 space-y-6">
          {monthlyData.length === 0 ? (
            <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 16, padding: "40px 20px", textAlign: "center" }}>
              <p className="text-sm text-slate-400">Aucune donnée mensuelle disponible.</p>
            </div>
          ) : (
            <>
              {/* Graphique dépenses par mois + cumul */}
              <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 16 }}>
                <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", gap: 8 }}>
                  <BarChart3 className="h-4 w-4" style={{ color: "#06b6d4" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: dark.text }}>Dépenses mensuelles par catégorie</span>
                </div>
                <div style={{ padding: "0 20px 20px" }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={cumulativeData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={dark.border} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickFormatter={v => { const [y, m] = v.split("-"); return new Date(parseInt(y), parseInt(m)-1).toLocaleDateString("fr-CA", { month: "short" }) + " " + y.slice(2) }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={v => `${(v / 1000).toFixed(0)}k $`} />
                      <Tooltip
                        contentStyle={{ background: dark.panel, border: "1px solid rgba(6,182,212,0.2)", borderRadius: 8, color: dark.text }}
                        formatter={(v: number | undefined, name: string | undefined) => [v !== undefined ? fmt(v) : "—", name ?? ""]}
                        labelFormatter={l => { const [y, m] = l.split("-"); return new Date(parseInt(y), parseInt(m)-1).toLocaleDateString("fr-CA", { month: "long", year: "numeric" }) }}
                      />
                      <Legend wrapperStyle={{ color: dark.sub, fontSize: 12 }} />
                      {Object.keys(CATEGORIES).map((cat, i) => (
                        <Bar key={cat} dataKey={cat} name={CATEGORIES[cat]} stackId="a" fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                      {totalBudget > 0 && (
                        <ReferenceLine
                          y={totalBudget / monthlyData.length}
                          stroke="#ef4444" strokeDasharray="5 5"
                          label={{ value: "Moy. budget/mois", fill: "#ef4444", fontSize: 10 }}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Graphique cumul vs budget total */}
              {totalBudget > 0 && (
                <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 16 }}>
                  <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", gap: 8 }}>
                    <LineChart className="h-4 w-4" style={{ color: "#06b6d4" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: dark.text }}>Progression cumulée vs budget total</span>
                  </div>
                  <div style={{ padding: "0 20px 20px" }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart data={cumulativeData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={dark.border} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickFormatter={v => { const [y, m] = v.split("-"); return new Date(parseInt(y), parseInt(m)-1).toLocaleDateString("fr-CA", { month: "short" }) }}
                        />
                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={v => `${(v / 1000).toFixed(0)}k $`} />
                        <Tooltip
                          contentStyle={{ background: dark.panel, border: "1px solid rgba(6,182,212,0.2)", borderRadius: 8, color: dark.text }}
                          formatter={(v: number | undefined) => v !== undefined ? fmt(v) : "—"}
                        />
                        <Area type="monotone" dataKey="cumul" name="Dépenses cumulées" fill="rgba(6,182,212,0.1)" stroke="#06b6d4" strokeWidth={2} />
                        <ReferenceLine y={totalBudget} stroke="#ef4444" strokeDasharray="6 3"
                          label={{ value: `Budget total ${fmt(totalBudget)}`, fill: "#ef4444", fontSize: 10 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tableau récap mensuel détaillé */}
              <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 16 }}>
                <div style={{ padding: "16px 20px 8px" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: dark.text }}>Récapitulatif par mois</span>
                </div>
                <div style={{ padding: "0 0 4px", overflowX: "auto" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${dark.border}` }}>
                        <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: dark.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>Mois</th>
                        {Object.entries(CATEGORIES).map(([k, l]) => {
                          const hex = CAT_HEX[k] ?? "#64748b"
                          return (
                            <th key={k} style={{ textAlign: "right", padding: "10px 12px", whiteSpace: "nowrap" }}>
                              <span style={{ background: hex + "20", color: hex, border: "1px solid " + hex + "40", fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "1px 6px" }}>
                                {l.split(" ")[0]}
                              </span>
                            </th>
                          )
                        })}
                        <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: dark.text }}>Total mois</th>
                        <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#06b6d4" }}>Cumul</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cumulativeData.map((row, i) => {
                        const [y, m] = row.month.split("-")
                        const label = new Date(parseInt(y), parseInt(m)-1).toLocaleDateString("fr-CA", { month: "long", year: "numeric" })
                        const isOver = totalBudget > 0 && row.cumul > totalBudget
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${dark.border}` }}>
                            <td style={{ padding: "10px 16px", fontWeight: 600, fontSize: 13, color: dark.text, textTransform: "capitalize" }}>{label}</td>
                            {Object.keys(CATEGORIES).map(cat => {
                              const val = (row as unknown as Record<string, number>)[cat]
                              const hex = CAT_HEX[cat] ?? "#64748b"
                              return (
                                <td key={cat} style={{ padding: "10px 12px", textAlign: "right", fontSize: 12 }}>
                                  {val
                                    ? <span style={{ fontWeight: 700, color: hex }}>{fmt(val)}</span>
                                    : <span style={{ color: dark.muted }}>—</span>
                                  }
                                </td>
                              )
                            })}
                            <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: dark.text, fontSize: 13 }}>{fmt(row.total)}</td>
                            <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: isOver ? "#ef4444" : "#06b6d4", fontSize: 13 }}>
                              {fmt(row.cumul)}
                              {totalBudget > 0 && (
                                <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400, color: isOver ? "#ef4444" : "#64748b" }}>
                                  ({Math.round((row.cumul / totalBudget) * 100)}%)
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "2px solid rgba(255,255,255,0.1)", background: dark.card }}>
                        <td style={{ padding: "10px 16px", fontWeight: 900, fontSize: 13, color: dark.text }}>TOTAL</td>
                        {Object.keys(CATEGORIES).map(cat => {
                          const catTotal = approvedExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
                          const hex = CAT_HEX[cat] ?? "#64748b"
                          return (
                            <td key={cat} style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, fontWeight: 700 }}>
                              {catTotal > 0 ? <span style={{ color: hex }}>{fmt(catTotal)}</span> : <span style={{ color: dark.muted }}>—</span>}
                            </td>
                          )
                        })}
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 900, color: dark.text, fontSize: 13 }}>{fmt(totalSpent)}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 900, color: budgetPct >= 100 ? "#ef4444" : "#06b6d4", fontSize: 13 }}>
                          {totalBudget > 0 ? `${Math.round(budgetPct)}% du budget` : "—"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Cartes mois par mois avec barre de progression */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: dark.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarDays className="h-4 w-4" style={{ color: "#06b6d4" }} />
                  Détail mois par mois
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {cumulativeData.map((row, i) => {
                    const [y, m] = row.month.split("-")
                    const label = new Date(parseInt(y), parseInt(m)-1).toLocaleDateString("fr-CA", { month: "long", year: "numeric" })
                    const monthBudget = totalBudget > 0 ? totalBudget / monthlyData.length : 0
                    const pctMonth = monthBudget > 0 ? Math.min((row.total / monthBudget) * 100, 100) : 0
                    const overMonth = monthBudget > 0 && row.total > monthBudget
                    const cumulPct  = totalBudget > 0 ? Math.min((row.cumul / totalBudget) * 100, 100) : 0

                    return (
                      <div
                        key={i}
                        style={{
                          background: dark.card,
                          border: overMonth ? "1px solid rgba(239,68,68,0.3)" : `1px solid ${dark.border}`,
                          borderRadius: 16,
                          padding: 16,
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span style={{ fontWeight: 700, fontSize: 13, color: dark.text, textTransform: "capitalize" }}>{label}</span>
                          <span style={{ fontWeight: 700, fontSize: 13, color: overMonth ? "#ef4444" : "#06b6d4" }}>{fmt(row.total)}</span>
                        </div>

                        {/* Catégories ce mois */}
                        <div className="space-y-1 mb-3">
                          {Object.keys(CATEGORIES).map(cat => {
                            const v = (row as unknown as Record<string, number>)[cat]
                            if (!v) return null
                            const hex = CAT_HEX[cat] ?? "#64748b"
                            return (
                              <div key={cat} className="flex items-center justify-between text-xs">
                                <span style={{ background: hex + "20", color: hex, border: "1px solid " + hex + "40", fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "1px 6px" }}>
                                  {CATEGORIES[cat].split(" ")[0]}
                                </span>
                                <span style={{ color: dark.sub, fontWeight: 600 }}>{fmt(v)}</span>
                              </div>
                            )
                          })}
                        </div>

                        {/* Barre budget mensuel moyen */}
                        {monthBudget > 0 && (
                          <div>
                            <div style={{ height: 4, background: dark.hover, borderRadius: 4, overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 4,
                                width: `${pctMonth}%`,
                                background: overMonth
                                  ? "linear-gradient(90deg, #ef4444, #f97316)"
                                  : pctMonth >= 90
                                  ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                                  : "linear-gradient(90deg, #10b981, #06b6d4)",
                                boxShadow: overMonth ? "0 0 8px #ef444460" : "0 0 8px #10b98160",
                              }} />
                            </div>
                            <p style={{ fontSize: 10, color: dark.sub, marginTop: 4 }}>
                              {Math.round(pctMonth)}% du budget mensuel moyen ({fmt(monthBudget)})
                            </p>
                          </div>
                        )}

                        {/* Conformité */}
                        <div style={{ paddingTop: 8, marginTop: 8, borderTop: `1px solid ${dark.border}` }}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Cumul</span>
                            <span style={{ fontWeight: 700, color: cumulPct >= 100 ? "#ef4444" : "#06b6d4" }}>
                              {fmt(row.cumul)} {totalBudget > 0 ? `(${Math.round(cumulPct)}%)` : ""}
                            </span>
                          </div>
                          {monthBudget > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: overMonth ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)", color: overMonth ? "#ef4444" : "#10b981", border: overMonth ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(16,185,129,0.3)" }}>
                                {overMonth ? "⚠ NON CONFORME" : "✓ CONFORME"}
                              </span>
                              <span style={{ fontSize: 10, color: dark.sub }}>
                                vs {distributionMode === "MONTHLY" ? "budget mensuel" : "budget hebdo"} ({fmt(monthBudget)})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Onglet Préparer Budget IA ── */}
        <TabsContent value="preparer" className="mt-4 space-y-4">
          <div style={{ padding: "16px 20px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 16 }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5" style={{ color: "#8b5cf6" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: dark.text }}>Préparation budgétaire assistée par IA</span>
            </div>
            <p style={{ fontSize: 13, color: dark.sub }}>
              L'IA analyse vos dépenses historiques et suggère un budget pour <strong style={{ color: dark.text }}>l'année {fiscalYear + 1}</strong>, catégorie par catégorie, avec justifications RS&DE.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Target className="h-4 w-4" style={{ color: "#8b5cf6" }} />
              <span style={{ fontSize: 13, color: dark.sub }}>Budget cible :</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: dark.text }}>{fiscalYear + 1}</span>
              <span style={{ fontSize: 12, color: dark.sub }}>(basé sur historique {fiscalYear - 1}–{fiscalYear})</span>
            </div>
            <Button
              onClick={handleGenerateIA}
              disabled={iaLoading || selectedProject === "all"}
              style={{ background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", border: "none", color: "white", boxShadow: "0 4px 15px rgba(139,92,246,0.4)" }}
            >
              {iaLoading
                ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Analyse en cours…</>
                : <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Générer avec l'IA</>
              }
            </Button>
            {selectedProject === "all" && (
              <p style={{ fontSize: 12, color: "#f59e0b" }}>Sélectionnez un projet spécifique pour utiliser l'IA.</p>
            )}
          </div>

          {iaError && (
            <p style={{ fontSize: 12, color: "#ef4444", padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8 }}>{iaError}</p>
          )}

          {iaResult && (
            <div className="space-y-4">
              {/* Global comment */}
              <div style={{ padding: "14px 16px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12 }}>
                <p style={{ fontSize: 13, color: "#c4b5fd", lineHeight: 1.6 }}>{iaResult.commentaireGlobal}</p>
              </div>

              {/* Alerts */}
              {iaResult.alertes?.length > 0 && (
                <div className="space-y-2">
                  {iaResult.alertes.map((alerte, i) => (
                    <div key={i} style={{ padding: "10px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#f59e0b" }} />
                      <p style={{ fontSize: 12, color: "#fcd34d" }}>{alerte}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions per category */}
              <div className="space-y-3">
                {Object.entries(iaResult.suggestions).map(([cat, s]) => {
                  const catHex = CAT_HEX[cat] ?? "#64748b"
                  const label = CATEGORIES[cat as keyof typeof CATEGORIES] ?? cat
                  const admColor = s.admissibilite === "ELIGIBLE" ? "#10b981" : s.admissibilite === "PARTIAL" ? "#f59e0b" : "#64748b"
                  return (
                    <div key={cat} style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 14, padding: 16 }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ background: catHex + "20", color: catHex, border: "1px solid " + catHex + "40", fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "2px 10px" }}>{label}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: admColor, padding: "2px 8px", borderRadius: 6, background: admColor + "15", border: "1px solid " + admColor + "30" }}>
                            {s.admissibilite === "ELIGIBLE" ? "✓ Admissible" : s.admissibilite === "PARTIAL" ? "~ Partiel" : "✗ Non admissible"}
                          </span>
                          {s.variation && <span style={{ fontSize: 11, color: dark.sub }}>{s.variation}</span>}
                        </div>
                        <span style={{ fontSize: 18, fontWeight: 900, color: "#8b5cf6", whiteSpace: "nowrap" }}>{fmt(s.montant)}</span>
                      </div>
                      <p style={{ fontSize: 12, color: dark.sub, lineHeight: 1.5 }}>{s.justification}</p>
                      <div className="flex justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${dark.border}` }}>
                        <span style={{ fontSize: 11, color: dark.sub }}>Mensuel suggéré : <span style={{ color: "#06b6d4", fontWeight: 700 }}>{fmt(s.montant / 12)}</span></span>
                        <span style={{ fontSize: 11, color: dark.sub }}>Hebdo : <span style={{ color: "#06b6d4", fontWeight: 700 }}>{fmt(s.montant / 52)}</span></span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-3">
                <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 12, padding: "14px 16px" }}>
                  <p style={{ fontSize: 11, color: dark.sub, fontWeight: 600 }}>TOTAL SUGGÉRÉ {fiscalYear + 1}</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: "#8b5cf6" }}>{fmt(iaResult.totalSuggere)}</p>
                </div>
                <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 12, padding: "14px 16px" }}>
                  <p style={{ fontSize: 11, color: dark.sub, fontWeight: 600 }}>RS&DE ADMISSIBLE ESTIMÉ</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: "#10b981" }}>{fmt(iaResult.totalRDEligible)}</p>
                </div>
              </div>

              {/* Apply button */}
              <Button
                onClick={handleApplyIASuggestions}
                disabled={iaApplying}
                style={{ width: "100%", background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", border: "none", color: "white", boxShadow: "0 4px 20px rgba(139,92,246,0.4)", padding: "12px" }}
              >
                {iaApplying
                  ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Application en cours…</>
                  : <><Download className="h-4 w-4 mr-2" />Appliquer ce budget pour {fiscalYear + 1}</>
                }
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Onglet Approbations ── */}
        {canApprove && (
          <TabsContent value="approbations" className="mt-4 space-y-4">
            {pendingExpenses.length === 0 ? (
              <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 16, padding: "48px 20px", textAlign: "center" }}>
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2" style={{ color: "#10b981" }} />
                <p className="text-sm text-slate-400">Aucune dépense en attente d'approbation.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingExpenses.map(exp => {
                  const approval     = exp.approval
                  const budgetBefore = approval?.budgetBefore ?? 0
                  const budgetTotal  = approval?.budgetTotal ?? 0
                  const afterAmount  = budgetBefore + exp.amount
                  const pctBefore    = budgetTotal > 0 ? Math.min((budgetBefore / budgetTotal) * 100, 100) : 0
                  const pctAfter     = budgetTotal > 0 ? Math.min((afterAmount / budgetTotal) * 100, 100) : 0
                  const wouldExceed  = budgetTotal > 0 && afterAmount > budgetTotal
                  const catHex       = CAT_HEX[exp.category] ?? "#64748b"

                  return (
                    <div
                      key={exp.id}
                      style={{
                        background: dark.card,
                        border: "1px solid rgba(249,115,22,0.3)",
                        borderLeft: "3px solid #f97316",
                        borderRadius: 16,
                        padding: 20,
                      }}
                    >
                      {/* Expense header */}
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ fontWeight: 700, fontSize: 14, color: dark.text }}>{exp.description}</span>
                            <span style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.4)", color: "#f97316", fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "1px 8px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <Clock className="h-2.5 w-2.5" />En attente
                            </span>
                            <span style={{ background: catHex + "20", color: catHex, border: "1px solid " + catHex + "40", fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "1px 8px" }}>
                              {CATEGORIES[exp.category]}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                            <span>{exp.project.code} — {exp.project.name}</span>
                            <span>{new Date(exp.date).toLocaleDateString("fr-CA")}</span>
                            {approval?.requestedBy && <span>Soumis par : {approval.requestedBy.name}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 900, color: "#06b6d4", textShadow: "0 0 20px #06b6d480" }}>{fmt(exp.amount)}</span>
                      </div>

                      {/* Budget situation */}
                      {budgetTotal > 0 && (
                        <div style={{ padding: 12, background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 10, marginBottom: 16 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: dark.sub, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Situation budgétaire</p>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-slate-400">Avant : <span style={{ color: "#06b6d4", fontWeight: 700 }}>{fmt(budgetBefore)}</span></span>
                            <span style={{ color: wouldExceed ? "#ef4444" : "#94a3b8", fontWeight: wouldExceed ? 700 : 400 }}>
                              Après : {fmt(afterAmount)} / {fmt(budgetTotal)}
                            </span>
                          </div>
                          <div style={{ height: 6, background: dark.hover, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                            <div style={{ height: "100%", background: "linear-gradient(90deg, #10b981, #06b6d4)", borderRadius: 4, position: "absolute", left: 0, top: 0, width: `${pctBefore}%`, boxShadow: "0 0 8px #10b98160" }} />
                            <div style={{
                              height: "100%", position: "absolute", top: 0,
                              left: `${pctBefore}%`,
                              width: `${Math.min(pctAfter - pctBefore, 100 - pctBefore)}%`,
                              background: wouldExceed ? "linear-gradient(90deg, #ef4444, #f97316)" : "linear-gradient(90deg, #f59e0b, #ef4444)",
                              boxShadow: wouldExceed ? "0 0 8px #ef444460" : "0 0 8px #f59e0b60",
                            }} />
                          </div>
                          <p style={{ fontSize: 11, marginTop: 6, color: wouldExceed ? "#ef4444" : "#64748b" }}>
                            {wouldExceed
                              ? <span style={{ fontWeight: 700 }}>Dépasse le budget de {fmt(afterAmount - budgetTotal)}</span>
                              : `${Math.round(pctAfter)}% du budget consommé après approbation`
                            }
                          </p>
                        </div>
                      )}

                      {/* Justification */}
                      {approval?.reason && (
                        <div style={{ padding: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, marginBottom: 16 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>Justification soumise</p>
                          <p style={{ fontSize: 13, color: "#fcd34d" }}>{approval.reason}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(exp.id)}
                          style={{ background: "linear-gradient(135deg,#10b981,#06b6d4)", border: "none", color: "white", boxShadow: "0 4px 12px rgba(16,185,129,0.4)" }}
                        >
                          <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />Approuver
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => { setRejectTarget(exp); setRejectComment("") }}
                          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}
                        >
                          <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />Rejeter
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* ── Dialog dépense ── */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) closeForm() }}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: dark.panel, border: "1px solid rgba(6,182,212,0.2)", color: dark.text }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: dark.text, fontWeight: 700 }}>{editTarget ? "Modifier la dépense" : "Nouvelle dépense"}</DialogTitle>
          </DialogHeader>

          {/* Step 2 — Approval required */}
          {approvalStep ? (
            <div className="space-y-4 mt-2">
              <div style={{ padding: 16, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12 }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: "#f59e0b" }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#fcd34d" }}>Approbation requise — dépassement budgétaire</p>
                </div>
                <p style={{ fontSize: 13, color: "#fcd34d", opacity: 0.85 }}>
                  Cette dépense ({fmt(parseFloat(approvalStep.pendingForm.amount))}) dépasse le budget disponible.
                </p>
                <div style={{ fontSize: 12, color: "#fcd34d", opacity: 0.75, display: "flex", gap: 16, marginTop: 6 }}>
                  <span>Budget consommé avant : <strong>{fmt(approvalStep.budgetBefore)}</strong></span>
                  <span>Budget total : <strong>{fmt(approvalStep.budgetTotal)}</strong></span>
                </div>
                <div style={{ height: 4, background: "rgba(245,158,11,0.2)", borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
                  <div
                    style={{
                      height: "100%", background: "linear-gradient(90deg, #f59e0b, #ef4444)", borderRadius: 4,
                      width: `${approvalStep.budgetTotal > 0 ? Math.min((approvalStep.budgetBefore / approvalStep.budgetTotal) * 100, 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label style={{ color: dark.sub }}>Justification / raison du dépassement *</Label>
                <Textarea
                  rows={4}
                  placeholder="Expliquez pourquoi cette dépense est nécessaire malgré le dépassement budgétaire…"
                  value={approvalReason}
                  onChange={e => setApprovalReason(e.target.value)}
                  style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }}
                />
              </div>

              {error && <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>}

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => { setApprovalStep(null); setApprovalReason("") }}
                  style={{ background: dark.hover, border: `1px solid ${dark.border}`, color: dark.text }}
                >
                  Retour
                </Button>
                <Button
                  onClick={handleSubmitWithApproval}
                  disabled={loading}
                  style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)", border: "none", color: "white", boxShadow: "0 4px 15px rgba(6,182,212,0.4)" }}
                >
                  {loading ? "Soumission…" : "Soumettre pour approbation"}
                </Button>
              </div>
            </div>
          ) : (
            /* Step 1 — Normal form */
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label style={{ color: dark.sub }}>Projet *</Label>
                  <Select value={form.projectId} onValueChange={v => setForm(p => ({ ...p, projectId: v }))} disabled={!!editTarget}>
                    <SelectTrigger style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }}>
                      <SelectValue placeholder="Sélectionner un projet" />
                    </SelectTrigger>
                    <SelectContent style={{ background: dark.panel, border: "1px solid rgba(6,182,212,0.2)", color: dark.text }}>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label style={{ color: dark.sub }}>Description *</Label>
                  <Input
                    placeholder="Ex: Achat de composants électroniques pour prototype v2"
                    value={form.description}
                    onChange={setF("description")}
                    style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: dark.sub }}>Montant (CAD) *</Label>
                  <Input
                    type="number" step="0.01" min="0" placeholder="0.00"
                    value={form.amount} onChange={setF("amount")}
                    style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: dark.sub }}>Date *</Label>
                  <Input
                    type="date" value={form.date} onChange={setF("date")}
                    style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: dark.sub }}>Catégorie *</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: dark.panel, border: "1px solid rgba(6,182,212,0.2)", color: dark.text }}>
                      {Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: dark.sub }}>Fournisseur</Label>
                  <Input
                    placeholder="Nom du fournisseur" value={form.supplier} onChange={setF("supplier")}
                    style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: dark.sub }}>N° facture / réf.</Label>
                  <Input
                    placeholder="INV-2024-001" value={form.invoiceRef} onChange={setF("invoiceRef")}
                    style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }}
                  />
                </div>
              </div>

              {/* Admissibilité RS&DE */}
              <div style={{ padding: 16, background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 12 }}>
                <div className="flex items-center gap-2 mb-3">
                  <p style={{ fontSize: 13, fontWeight: 700, color: dark.text }}>Admissibilité RS&DE</p>
                  <div className="group relative">
                    <Info className="h-3.5 w-3.5 cursor-help" style={{ color: dark.sub }} />
                    <div className="absolute bottom-5 left-0 z-10 hidden group-hover:block w-64 p-2.5 text-xs rounded-lg shadow-lg" style={{ background: dark.panel, border: "1px solid rgba(6,182,212,0.2)", color: dark.sub }}>
                      {SRDE_HELP[form.category]}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(SRDE_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon
                    const isSelected = form.srdeEligibility === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, srdeEligibility: key }))}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                          padding: 12, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          background: isSelected ? "rgba(6,182,212,0.1)" : dark.hover,
                          border: isSelected ? "2px solid rgba(6,182,212,0.5)" : `2px solid ${dark.border}`,
                          color: isSelected ? "#06b6d4" : "#64748b",
                          transition: "all 0.15s",
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>

                {form.srdeEligibility === "PARTIAL" && (
                  <div className="space-y-1.5 mt-3">
                    <Label className="text-xs" style={{ color: dark.sub }}>Pourcentage admissible RS&DE</Label>
                    <div className="flex items-center gap-2">
                      <Input type="range" min="10" max="90" step="5" value={form.srdePercentage} onChange={setF("srdePercentage")} className="flex-1" />
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#06b6d4", width: 48, textAlign: "center" }}>{form.srdePercentage}%</span>
                    </div>
                  </div>
                )}

                <p style={{ fontSize: 12, color: dark.muted, fontStyle: "italic", marginTop: 8 }}>{SRDE_HELP[form.category]}</p>
              </div>

              <div className="space-y-1.5">
                <Label style={{ color: dark.sub }}>Notes</Label>
                <Textarea
                  rows={2} placeholder="Notes supplémentaires…" value={form.notes} onChange={setF("notes")}
                  style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }}
                />
              </div>

              {error && <p style={{ fontSize: 13, color: "#ef4444" }}>{error}</p>}
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={closeForm}
                  style={{ background: dark.hover, border: `1px solid ${dark.border}`, color: dark.text }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)", border: "none", color: "white", boxShadow: "0 4px 15px rgba(6,182,212,0.4)" }}
                >
                  {loading ? "Enregistrement…" : editTarget ? "Mettre à jour" : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog rejet ── */}
      <Dialog open={!!rejectTarget} onOpenChange={open => { if (!open) { setRejectTarget(null); setRejectComment("") } }}>
        <DialogContent
          className="max-w-md"
          style={{ background: dark.panel, border: "1px solid rgba(6,182,212,0.2)", color: dark.text }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: dark.text, fontWeight: 700 }}>Rejeter la dépense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {rejectTarget && (
              <p style={{ fontSize: 13, color: dark.sub }}>
                Vous allez rejeter <strong style={{ color: dark.text }}>{rejectTarget.description}</strong> (<span style={{ color: "#06b6d4" }}>{fmt(rejectTarget.amount)}</span>).
              </p>
            )}
            <div className="space-y-1.5">
              <Label style={{ color: dark.sub }}>Commentaire (optionnel)</Label>
              <Textarea
                rows={3}
                placeholder="Raison du rejet…"
                value={rejectComment}
                onChange={e => setRejectComment(e.target.value)}
                style={{ background: dark.input, border: `1px solid ${dark.border}`, color: dark.text }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => { setRejectTarget(null); setRejectComment("") }}
                style={{ background: dark.hover, border: `1px solid ${dark.border}`, color: dark.text }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleReject}
                disabled={rejectLoading}
                style={{ background: "linear-gradient(135deg,#ef4444,#f97316)", border: "none", color: "white", boxShadow: "0 4px 15px rgba(239,68,68,0.4)" }}
              >
                {rejectLoading ? "Rejet…" : "Confirmer le rejet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Vue classique (light theme) ───────────────────────────────────────────────
function ClassiqueDepenses(p: {
  viewMode: string; setViewMode: (v: "futuriste" | "classique") => void
  projects: Project[]; expenses: Expense[]; approvedExpenses: Expense[]
  pendingExpenses: Expense[]; expensesByMonth: [string, Expense[]][]
  byCategory: Record<string, { spent: number; budget: number }>
  monthlyData: any[]; cumulativeData: any[]
  totalSpent: number; totalBudget: number; budgetPct: number; rdEligible: number
  alertLevel: string | null; budgetAlert: string | null; setBudgetAlert: (v: string | null) => void
  filterCat: string; setFilterCat: (v: string) => void
  collapsedMonths: Set<string>; setCollapsedMonths: (fn: (p: Set<string>) => Set<string>) => void
  editingBudget: boolean; budgetForm: Record<string,string>; setBudgetForm: (fn: (p: Record<string,string>) => Record<string,string>) => void
  savingBudget: boolean; canApprove: boolean
  selectedProject: string; setSelectedProject: (v: string) => void
  openNew: () => void; openEdit: (e: Expense) => void; handleDelete: (id: string) => void
  handleApprove: (id: string) => void; setRejectTarget: (e: Expense | null) => void
  fmt: (n: number) => string
}) {
  const { viewMode, setViewMode, expenses, approvedExpenses, pendingExpenses, expensesByMonth,
    byCategory, totalSpent, totalBudget, budgetPct, rdEligible, alertLevel, budgetAlert,
    filterCat, setFilterCat, collapsedMonths, setCollapsedMonths,
    editingBudget, budgetForm, setBudgetForm, savingBudget, canApprove,
    selectedProject, setSelectedProject, openNew, openEdit, handleDelete,
    handleApprove, setRejectTarget, fmt, projects, setBudgetAlert } = p

  const KPI_CARDS = [
    { label:"Total approuvé",      value: fmt(totalSpent),        sub: null,                       gradient:"linear-gradient(135deg,#1e40af,#3b82f6)", shadow:"rgba(59,130,246,0.35)" },
    { label:"Budget prévu",        value: totalBudget > 0 ? fmt(totalBudget) : "—", sub: null,     gradient:"linear-gradient(135deg,#6d28d9,#8b5cf6)", shadow:"rgba(139,92,246,0.35)" },
    { label:"Consommé",            value: totalBudget > 0 ? `${Math.round(budgetPct)}%` : "—", sub: totalBudget > 0 ? `${fmt(totalSpent)} / ${fmt(totalBudget)}` : null, gradient: budgetPct >= 100 ? "linear-gradient(135deg,#dc2626,#ef4444)" : budgetPct >= 90 ? "linear-gradient(135deg,#b45309,#f59e0b)" : "linear-gradient(135deg,#065f46,#10b981)", shadow: budgetPct >= 100 ? "rgba(239,68,68,0.35)" : budgetPct >= 90 ? "rgba(245,158,11,0.35)" : "rgba(16,185,129,0.35)" },
    { label:"Admissible RS&DE",    value: fmt(rdEligible),        sub: totalSpent > 0 ? `${Math.round((rdEligible / totalSpent) * 100)}% du total` : null, gradient:"linear-gradient(135deg,#065f46,#059669)", shadow:"rgba(5,150,105,0.35)" },
  ]

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dépenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">Suivi budgétaire et admissibilité RS&DE</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setViewMode("futuriste"); localStorage.setItem("depenses-view-mode","futuriste") }}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >🌙 Vue futuriste</button>
          <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow:"0 4px 14px rgba(99,102,241,0.4)" }}>
            <Plus className="h-4 w-4" />Nouvelle dépense
          </button>
        </div>
      </div>

      {/* Sélecteur projet */}
      <Select value={selectedProject} onValueChange={v => setSelectedProject(v)}>
        <SelectTrigger className="w-[260px] bg-white"><SelectValue placeholder="Tous les projets" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les projets</SelectItem>
          {projects.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.code} — {pr.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Alerte budget */}
      {(alertLevel || budgetAlert) && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${alertLevel === "exceeded" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${alertLevel === "exceeded" ? "text-red-500" : "text-amber-500"}`} />
          <p className="text-sm flex-1">{alertLevel === "exceeded" ? `Budget dépassé ! (${fmt(totalSpent)} / ${fmt(totalBudget)})` : `${Math.round(budgetPct)}% du budget atteint.`}</p>
          <button className="text-slate-400 hover:text-slate-600" onClick={() => setBudgetAlert(null)}>✕</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {KPI_CARDS.map((k, i) => (
          <div key={i} className="rounded-2xl p-5 text-white hover:-translate-y-1 transition-transform"
            style={{ background: k.gradient, boxShadow: `0 8px 24px ${k.shadow}, inset 0 1px 0 rgba(255,255,255,0.15)` }}>
            <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2">{k.label}</p>
            <p className="text-2xl font-black">{k.value}</p>
            {k.sub && <p className="text-xs opacity-75 mt-1">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="depenses">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="depenses"><CalendarDays className="h-3.5 w-3.5 mr-1.5" />Dépenses ({expenses.length})</TabsTrigger>
          <TabsTrigger value="budget"><Settings2 className="h-3.5 w-3.5 mr-1.5" />Budget</TabsTrigger>
          {canApprove && (
            <TabsTrigger value="approbations" className="relative">
              <Clock className="h-3.5 w-3.5 mr-1.5" />Approbations
              {pendingExpenses.length > 0 && <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-orange-500 text-white text-[10px] font-bold">{pendingExpenses.length}</span>}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Dépenses par mois */}
        <TabsContent value="depenses" className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-[200px] bg-white"><SelectValue placeholder="Toutes catégories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {expensesByMonth.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-slate-400">Aucune dépense.</CardContent></Card>
          ) : expensesByMonth.map(([month, monthExp]) => {
            const isCollapsed = collapsedMonths.has(month)
            const monthApproved = monthExp.filter(e => e.status === "APPROVED").reduce((s, e) => s + e.amount, 0)
            const hasPending = monthExp.some(e => e.status === "PENDING")
            const [yr, mo] = month.split("-")
            const monthLabel = new Date(parseInt(yr), parseInt(mo)-1, 1).toLocaleDateString("fr-CA", { month:"long", year:"numeric" })
            return (
              <Card key={month} className="overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => setCollapsedMonths(prev => { const n = new Set(prev); n.has(month) ? n.delete(month) : n.add(month); return n })}>
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-indigo-500" />
                    <span className="font-semibold text-sm capitalize">{monthLabel}</span>
                    <span className="text-xs text-slate-400">{monthExp.length} dépense{monthExp.length > 1 ? "s" : ""}</span>
                    {hasPending && <Badge className="bg-orange-100 text-orange-700 text-[10px]"><Clock className="h-2.5 w-2.5 mr-0.5" />En attente</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{fmt(monthApproved)}</span>
                    {isCollapsed ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="divide-y border-t">
                    {monthExp.map(exp => {
                      const srdeCfg = SRDE_CONFIG[exp.srdeEligibility as keyof typeof SRDE_CONFIG]
                      const SrdeIcon = srdeCfg.icon
                      const isPending = exp.status === "PENDING"; const isRejected = exp.status === "REJECTED"
                      return (
                        <div key={exp.id} className={`flex items-start gap-3 px-5 py-3 hover:bg-slate-50 group ${isRejected ? "opacity-60" : ""}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${isRejected ? "line-through text-slate-400" : "text-slate-800"}`}>{exp.description}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_COLORS[exp.category]}`}>{CATEGORIES[exp.category]}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${srdeCfg.color}`}><SrdeIcon className="h-3 w-3" />{exp.srdeEligibility === "PARTIAL" ? `Partiel ${exp.srdePercentage ?? 50}%` : srdeCfg.label}</span>
                              <span className="text-xs text-slate-400">{exp.project.code}</span>
                              {isPending && <Badge className="bg-orange-100 text-orange-700 text-[10px]"><Clock className="h-2.5 w-2.5 mr-0.5" />En attente</Badge>}
                              {isRejected && <Badge className="bg-red-100 text-red-700 text-[10px]"><XCircle className="h-2.5 w-2.5 mr-0.5" />Rejetée</Badge>}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{new Date(exp.date).toLocaleDateString("fr-CA")}{exp.supplier ? ` · ${exp.supplier}` : ""}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-sm font-bold ${isRejected ? "line-through text-slate-400" : "text-slate-800"}`}>{fmt(exp.amount)}</span>
                            {!isPending && !isRejected && (
                              <>
                                <button onClick={() => openEdit(exp)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 p-1 rounded transition-opacity"><Pencil className="h-3.5 w-3.5" /></button>
                                <button onClick={() => handleDelete(exp.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded transition-opacity"><Trash2 className="h-3.5 w-3.5" /></button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </TabsContent>

        {/* Budget */}
        <TabsContent value="budget" className="mt-4 space-y-3">
          {Object.entries(CATEGORIES).map(([cat, label]) => {
            const data = byCategory[cat]; const budget = data.budget; const pct = budget > 0 ? Math.min((data.spent / budget) * 100, 100) : 0; const over = budget > 0 && data.spent > budget
            return (
              <Card key={cat} className={over ? "border-red-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_COLORS[cat]}`}>{label}</span>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`font-semibold ${over ? "text-red-600" : ""}`}>{fmt(data.spent)}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-500">{budget > 0 ? fmt(budget) : "—"}</span>
                    </div>
                  </div>
                  {budget > 0 && (
                    <>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${over ? "bg-red-500" : pct >= 90 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width:`${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{Math.round(pct)}% · Restant : {fmt(Math.max(budget - data.spent, 0))}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* Approbations */}
        {canApprove && (
          <TabsContent value="approbations" className="mt-4 space-y-3">
            {pendingExpenses.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-sm text-slate-400">Aucune approbation en attente.</CardContent></Card>
            ) : pendingExpenses.map(exp => (
              <Card key={exp.id} className="border-orange-200">
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{exp.description}</p>
                    <p className="text-sm text-slate-500">{exp.project.name} · {fmt(exp.amount)} · {new Date(exp.date).toLocaleDateString("fr-CA")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleApprove(exp.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg" style={{ background:"linear-gradient(135deg,#10b981,#059669)" }}>
                      <ThumbsUp className="h-3.5 w-3.5" />Approuver
                    </button>
                    <button onClick={() => setRejectTarget(exp)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg" style={{ background:"linear-gradient(135deg,#ef4444,#dc2626)" }}>
                      <ThumbsDown className="h-3.5 w-3.5" />Rejeter
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

